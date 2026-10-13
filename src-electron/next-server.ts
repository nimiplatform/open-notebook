import path from 'node:path';
import { utilityProcess } from 'electron';
import { freePort } from './notebook-worker.js';

export async function startNotebookRenderer(root: string) {
  const port = await freePort();
  // Windows socket initialization in Electron's utility process needs SystemRoot.
  // Keep the renderer environment bounded: it must not inherit Host credentials.
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port) };
  if (process.platform === 'win32') env.SystemRoot = process.env.SystemRoot;
  const server = utilityProcess.fork(path.join(root, 'server.js'), [], {
    cwd: root,
    env,
    stdio: 'pipe',
  });
  let exitCode: number | null = null;
  server.once('exit', code => { exitCode = code; });
  server.stderr?.on('data', chunk => process.stderr.write(`[notebook-renderer] ${chunk}`));
  const url = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (exitCode !== null) throw new Error(`Notebook renderer exited during startup (code ${exitCode})`);
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        await response.body?.cancel();
        if (response.status < 500 && exitCode === null) return { url, stop: () => server.kill() };
      } catch { /* Retry while the process starts, within the bound below. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Notebook renderer did not become ready');
  } catch (error) {
    server.kill();
    throw error;
  }
}
