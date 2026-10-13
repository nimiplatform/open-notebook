import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import electron from 'electron';

test('real Electron renderer binds loopback, isolates Host environment, stops and reports early exit', { timeout: 25000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'notebook-renderer-'));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, [fileURLToPath(new URL('./renderer-lifecycle.cjs', import.meta.url)), root], {
    env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-8000); });
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-8000); });
  const timeout = setTimeout(() => child.kill(), 20000);
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', resolve);
    });
    assert.equal(code, 0, output);
  } finally {
    clearTimeout(timeout);
    child.kill();
    await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});
