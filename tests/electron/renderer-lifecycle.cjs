const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = process.argv[2];
app.setPath('userData', path.join(root, 'profile'));
process.env.NOTEBOOK_RENDERER_PRIVATE_TEST = 'must-stay-in-host';

app.whenReady().then(async () => {
  const { startNotebookRenderer } = await import('../../dist-electron/next-server.js');
  const serving = path.join(root, 'serving');
  const failing = path.join(root, 'failing');
  await fs.mkdir(serving);
  await fs.mkdir(failing);
  // Real utility-process networking, without involving a Nimi session or model.
  await fs.writeFile(path.join(serving, 'server.js'), `
    require('node:http').createServer((request, response) => {
      response.end(JSON.stringify({
        hostname: process.env.HOSTNAME,
        privateValue: process.env.NOTEBOOK_RENDERER_PRIVATE_TEST ?? null,
      }));
    }).listen(Number(process.env.PORT), process.env.HOSTNAME);
  `);
  const renderer = await startNotebookRenderer(serving);
  try {
    const response = await fetch(renderer.url);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { hostname: '127.0.0.1', privateValue: null });
  } finally { renderer.stop(); }
  await assert.rejects(async () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const response = await fetch(renderer.url, { signal: AbortSignal.timeout(500) });
      await response.body?.cancel();
    }
  });
  await fs.writeFile(path.join(failing, 'server.js'), 'process.exit(17);');
  const started = Date.now();
  await assert.rejects(startNotebookRenderer(failing), /exited during startup \(code 17\)/);
  assert.ok(Date.now() - started < 10000, 'an exited renderer must not wait for the startup timeout');
}).then(() => app.exit(0), error => {
  console.error(error);
  app.exit(1);
});
