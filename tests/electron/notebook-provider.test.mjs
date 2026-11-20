import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import os from 'node:os';
import { startNotebookProvider, NOTEBOOK_PROVIDER_OPERATIONS } from '../../dist-electron/notebook-provider.js';
import { findNotebookRoute, CHUNK_BYTES } from '../../dist-electron/notebook-contract.js';

async function fixture(t) {
  const requests = [];
  let streamClosed = false;
  const server = http.createServer(async (req, res) => {
    requests.push(req.url);
    assert.equal(req.headers['x-notebook-process'], 'private-test-transport');
    if (req.url === '/api/search/ask') {
      res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write('data: {"step":"started"}\n\n');
      res.on('close', () => { streamClosed = true; });
    } else if (req.url === '/api/notes') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ text: '真实中文边界 '.repeat(30000) })); }
    else if (req.url === '/api/sources') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ bytes: Buffer.concat(chunks).length, contentType: req.headers['content-type'] }));
    } else { res.writeHead(404); res.end('missing'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let waiter; const queued = []; const results = new Map(); let count = 0;
  const integration = {
    registerProvider: async () => ({ targetRef: 'test-target' }), unregisterProvider: async () => ({}),
    pollProvider: async () => queued.length ? { calls: queued.splice(0), canceledCallIds: [] } : new Promise(r => { waiter = r; }),
    completeProvider: async result => { results.get(result.callId)(result); return {}; },
  };
  const provider = startNotebookProvider(integration, async () => ({ apiUrl: `http://127.0.0.1:${server.address().port}`, token: 'private-test-transport' }), os.tmpdir(), e => { throw e; }, async () => [{ voiceId: 'configured-voice', name: 'Configured voice' }]);
  async function invoke(operation, input, consumerRef = 'verified-consumer-a') {
    const callId = String(++count);
    const output = new Promise(r => results.set(callId, r));
    const call = { callId, operation, inputJson: JSON.stringify(input), consumerRef, consumerDisplayName: 'Same display name' };
    if (waiter) { const ready = waiter; waiter = null; ready({ calls: [call], canceledCallIds: [] }); } else queued.push(call);
    const result = await output;
    if (result.errorCode) throw new Error(result.errorCode);
    return JSON.parse(result.resultJson);
  }
  t.after(async () => { provider.stop(); waiter?.({ calls: [], canceledCallIds: [] }); await provider.settled; await new Promise(r => server.close(r)); });
  return { invoke, requests, isStreamClosed: () => streamClosed };
}
const delay = () => new Promise(r => setTimeout(r, 5));

test('fixed Notebook operation routing rejects arbitrary URLs and separates literal paths from records', () => {
  assert.equal(findNotebookRoute('GET', '/models/defaults').route.name, 'notebook.models.defaults');
  assert.equal(findNotebookRoute('POST', '/sources/check-duplicates').route.name, 'notebook.sources.check_duplicates');
  assert.equal(findNotebookRoute('POST', '/sources/source:123/chat/sessions/chat:1/messages').params.session, 'chat:1');
  assert.throws(() => findNotebookRoute('POST', '/runtime/execute'), /UNAVAILABLE/);
  assert.ok(NOTEBOOK_PROVIDER_OPERATIONS.every(op => op.retryPolicy === 'none' && op.supportsCancel === false));
});

test('response chunks preserve bytes and cannot be read or closed by a same-name different consumer', async t => {
  const { invoke } = await fixture(t);
  const { transferId } = await invoke('notebook.notes.list', {});
  await assert.rejects(invoke('notebook.transfer.read', { transferId, offset: 0 }, 'verified-consumer-b'), /TRANSFER_UNAVAILABLE/);
  await assert.rejects(invoke('notebook.transfer.close', { transferId }, 'verified-consumer-b'), /TRANSFER_UNAVAILABLE/);
  const chunks = []; let offset = 0; let finished = false;
  while (!finished) {
    const result = await invoke('notebook.transfer.read', { transferId, offset });
    assert.equal(result.error, '');
    const bytes = Buffer.from(result.base64, 'base64'); assert.ok(bytes.length <= CHUNK_BYTES); chunks.push(bytes); offset += bytes.length;
    finished = result.done; if (!bytes.length) await delay();
  }
  assert.equal(JSON.parse(Buffer.concat(chunks)).text, '真实中文边界 '.repeat(30000));
  await invoke('notebook.transfer.close', { transferId });
  await assert.rejects(invoke('notebook.transfer.read', { transferId, offset: 0 }), /TRANSFER_UNAVAILABLE/);
});

test('upload ownership, exact offsets and multipart delivery survive the public chunk boundary', async t => {
  const { invoke } = await fixture(t);
  const bytes = Buffer.from('文件📚'.repeat(20000));
  const { transferId } = await invoke('notebook.upload.begin', { name: '研究.txt', type: 'text/plain', size: bytes.length });
  await assert.rejects(invoke('notebook.upload.append', { transferId, offset: 0, base64: 'YWJj' }, 'verified-consumer-b'), /TRANSFER_UNAVAILABLE/);
  await assert.rejects(invoke('notebook.upload.append', { transferId, offset: 1, base64: 'YWJj' }), /OFFSET_INVALID/);
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) await invoke('notebook.upload.append', { transferId, offset, base64: bytes.subarray(offset, offset + CHUNK_BYTES).toString('base64') });
  const response = await invoke('notebook.sources.create', { form: [{ name: 'type', value: 'upload' }, { name: 'file', uploadId: transferId }] });
  let result;
  do { result = await invoke('notebook.transfer.read', { transferId: response.transferId, offset: 0 }); if (!result.done) await delay(); } while (!result.done);
  assert.equal(result.error, '');
  const body = JSON.parse(Buffer.from(result.base64, 'base64'));
  assert.ok(body.bytes > bytes.length); assert.match(body.contentType, /^multipart\/form-data; boundary=/);
  await invoke('notebook.transfer.close', { transferId: response.transferId });
});

test('record traversal never reaches the private backend', async t => {
  const { invoke, requests } = await fixture(t);
  const { transferId } = await invoke('notebook.notes.get', { params: { id: '../config' } });
  let result; do { result = await invoke('notebook.transfer.read', { transferId, offset: 0 }); if (!result.done) await delay(); } while (!result.done);
  assert.equal(result.error, 'NOTEBOOK_INVALID_RECORD'); assert.deepEqual(requests, []);
});

test('explicit transfer close aborts the original streaming request without replay', async t => {
  const { invoke, requests, isStreamClosed } = await fixture(t);
  const { transferId } = await invoke('notebook.search.ask', { body: { question: 'Synthetic cancellation transport test' } });
  let chunk;
  do { chunk = await invoke('notebook.transfer.read', { transferId, offset: 0 }); if (!chunk.status) await delay(); } while (!chunk.status);
  assert.equal(chunk.status, 200); assert.equal(chunk.done, false);
  await invoke('notebook.transfer.close', { transferId });
  for (let i = 0; i < 100 && !isStreamClosed(); i++) await delay();
  assert.equal(isStreamClosed(), true);
  assert.deepEqual(requests, ['/api/search/ask']);
});
