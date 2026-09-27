import path from 'node:path';
import { utilityProcess } from 'electron';
import { freePort } from './notebook-worker.js';

export async function startNotebookRenderer() {
  const port = await freePort();
  const root = path.join(process.resourcesPath, 'notebook-renderer', 'frontend');
  const server = utilityProcess.fork(path.join(root, 'server.js'), [], {
    cwd: root,
    env: { NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port) },
    stdio: 'pipe',
  });
  server.stderr?.on('data', chunk => process.stderr.write(`[notebook-renderer] ${chunk}`));
  const url = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).status < 500) return { url, stop: () => server.kill() }; } catch { /* Startup is bounded below. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  server.kill(); throw new Error('Notebook renderer did not become ready');
}
