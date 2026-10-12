import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { asNimiError } from '@nimiplatform/sdk';
import { StringDecoder } from 'node:string_decoder';
import type { NimiElectronAppBusinessServices } from '@nimiplatform/kit/shell/electron/main';
import { notebookAI } from './notebook-ai.js';

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer(); server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); });
  });
}
export class NotebookWorker {
  readonly token = randomBytes(32).toString('hex');
  readonly controller = new AbortController();
  private children: ChildProcessWithoutNullStreams[] = [];
  private failure = '';
  private startupLog = '';
  private calls = new Map<string, AbortController>();
  apiUrl = '';
  constructor(private services: NimiElectronAppBusinessServices, private appRoot: string, private dataRoot: string, private rendererOrigin: string, private packaged: boolean) {}
  async start() {
    const signal = this.controller.signal;
    const doc = await this.services.storage.readJson('notebook/workspace.json').catch(error => {
      const detail = asNimiError(error);
      if (detail.reasonCode === 'NOT_FOUND' || detail.reasonCode === 'not-found') return { value: null, sizeBytes: 0 };
      throw error;
    });
    signal.throwIfAborted();
    let workspace = (doc.value as { workspace?: string } | null)?.workspace;
    if (doc.value == null) {
      workspace = randomUUID();
      await this.services.storage.writeJson('notebook/workspace.json', { workspace });
    }
    if (!workspace || !/^[a-f0-9-]{36}$/.test(workspace)) throw new Error('Invalid notebook storage reference');
    signal.throwIfAborted();
    const data = path.join(this.dataRoot, 'workspaces', workspace);
    await mkdir(data, { recursive: true, mode: 0o700 });
    const dbPort = await freePort(); const apiPort = await freePort();
    this.apiUrl = `http://127.0.0.1:${apiPort}`;
    const databaseSecretPath = path.join(data, 'database-password');
    let dbPassword: string;
    try { dbPassword = await readFile(databaseSecretPath, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      dbPassword = randomBytes(32).toString('hex');
      await writeFile(databaseSecretPath, dbPassword, { mode: 0o600, flag: 'wx' });
    }
    if (!/^[a-f0-9]{64}$/.test(dbPassword)) throw new Error('Invalid notebook database secret');
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH, HOME: process.env.HOME, SYSTEMROOT: process.env.SYSTEMROOT,
      PYTHON_DOTENV_DISABLED: '1', LANG: 'en_US.UTF-8', PYTHONUTF8: '1', PYTHONUNBUFFERED: '1', PYTHONNOUSERSITE: '1',
      OPEN_NOTEBOOK_DATA_DIR: data, OPEN_NOTEBOOK_HOST_TOKEN: this.token,
      OPEN_NOTEBOOK_API_PORT: String(apiPort), CORS_ORIGINS: this.rendererOrigin,
      SURREAL_URL: `ws://127.0.0.1:${dbPort}/rpc`, SURREAL_USER: 'notebook', SURREAL_PASSWORD: dbPassword,
      SURREAL_NAMESPACE: 'open_notebook', SURREAL_DATABASE: 'open_notebook',
      NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost',
    };
    const resources = this.packaged ? path.join(process.resourcesPath, 'notebook') : path.join(this.appRoot, '.nimi/local/bin');
    const surreal = path.join(resources, process.platform === 'win32' ? 'surreal.exe' : 'surreal');
    this.child(surreal, ['start', '--bind', `127.0.0.1:${dbPort}`, '--user', 'notebook', '--pass', dbPassword, `rocksdb:${path.join(data, 'database')}`], env);
    const python = this.packaged ? path.join(resources, 'notebook-worker', process.platform === 'win32' ? 'notebook-worker.exe' : 'notebook-worker') : path.join(this.appRoot, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const worker = this.child(python, this.packaged ? [] : ['-m', 'open_notebook.nimi.worker'], env, false);
    const decoder = new StringDecoder('utf8'); let pending = '';
    worker.stdout.on('data', (chunk: Buffer) => {
      pending += decoder.write(chunk);
      if (Buffer.byteLength(pending) > 64 * 1024 * 1024) { this.stop(); return; }
      for (;;) {
        const end = pending.indexOf('\n'); if (end < 0) break;
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        try {
          const request = JSON.parse(line);
          if (request.cancel) { this.calls.get(request.cancel)?.abort(); continue; }
          if (typeof request.id !== 'string' || typeof request.operation !== 'string' || this.calls.has(request.id)) throw new Error('Invalid worker request');
          const controller = new AbortController(); this.calls.set(request.id, controller);
          const reply = (packet: unknown) => { if (!signal.aborted && !worker.stdin.destroyed) worker.stdin.write(JSON.stringify({ id: request.id, ...packet as object }) + '\n'); };
          void notebookAI(this.services, request.operation, request.payload, controller.signal, text => reply({ delta: text }))
            .then(result => reply({ result }), error => reply({ error: error instanceof Error ? error.message : String(error) }))
            .finally(() => this.calls.delete(request.id));
        } catch (error) { process.stderr.write(`Notebook worker protocol failed: ${String(error)}\n`); this.stop(); }
      }
    });
    for (let attempt = 0; attempt < 240; attempt++) {
      if (signal.aborted) throw new Error(this.failure || 'Notebook startup canceled');
      try { if ((await fetch(`${this.apiUrl}/health`, { signal })).ok) return { apiUrl: this.apiUrl }; } catch { signal.throwIfAborted(); }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    this.stop(); throw new Error(`Notebook backend did not become ready. ${this.startupLog}`);
  }
  private child(command: string, args: string[], env: NodeJS.ProcessEnv, logStdout = true) {
    const child = spawn(command, args, { cwd: this.packaged ? path.join(process.resourcesPath, 'notebook/notebook-worker/_internal') : this.appRoot, env, stdio: 'pipe', windowsHide: true });
    this.children.push(child);
    if (logStdout) child.stdout.on('data', c => { this.startupLog = (this.startupLog + String(c)).slice(-2500); process.stderr.write(`[notebook] ${c}`); });
    child.stderr.on('data', c => { this.startupLog = (this.startupLog + String(c)).slice(-2500); process.stderr.write(`[notebook] ${c}`); });
    child.once('error', error => { this.failure = error.message; process.stderr.write(`[notebook] ${error.message}\n`); this.stop(); });
    child.once('exit', code => { if (!this.controller.signal.aborted) { this.failure = `Notebook process exited (${code}): ${this.startupLog}`; this.stop(); } });
    return child;
  }
  stop() {
    this.controller.abort();
    for (const call of this.calls.values()) call.abort();
    this.calls.clear();
    for (const child of this.children) {
      child.kill();
      const timer = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 2000); timer.unref();
    }
    this.children = [];
  }
}
