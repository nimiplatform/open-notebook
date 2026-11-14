// @nimi-authority: rule.nimi.runtime.integration.fixed-operations
import { randomUUID } from 'node:crypto';
import { mkdtemp, open, rm, type FileHandle } from 'node:fs/promises';
import { openAsBlob } from 'node:fs';
import path from 'node:path';
import type { NimiLocalAppIntegrationClient, NimiIntegrationProviderCall } from '@nimiplatform/sdk/app';
import { CHUNK_BYTES, MAX_FILE_BYTES, NOTEBOOK_INTEGRATION_ID, NOTEBOOK_ROUTES, type NotebookRequest } from './notebook-contract.js';

const object = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required });
const idSchema = { type: 'string', minLength: 1, maxLength: 128 };
const transferOutput = object({ transferId: idSchema }, ['transferId']);
const paramsSchema = { type: 'object', maxProperties: 8, additionalProperties: { type: 'string', maxLength: 1024 } };
const requestSchema = object({ params: paramsSchema, query: { type: 'object', maxProperties: 32, additionalProperties: { type: 'string', maxLength: 8192 } }, body: {}, bodyUploadId: idSchema, form: { type: 'array', maxItems: 32, items: object({ name: { type: 'string', maxLength: 128 }, value: { type: 'string', maxLength: 180000 }, uploadId: idSchema, textUploadId: idSchema }, ['name']) } });
const operation = (name: string, input: object, output: object, effect = 'write') => ({ name, displayName: name.replace(/^notebook\./, '').replaceAll('_', ' ').replaceAll('.', ' · '), description: `Open Notebook business operation: ${name}. Existing PC workspace and worker own execution. Never automatically replay.`, inputSchemaJson: JSON.stringify(input), outputSchemaJson: JSON.stringify(output), effect, supportsCancel: false, retryPolicy: 'none' });
export const NOTEBOOK_PROVIDER_OPERATIONS = [
  operation('notebook.podcasts.voices', object({}), object({ voices: { type: 'array', items: object({ voiceId: { type: 'string' }, name: { type: 'string' } }, ['voiceId', 'name']) } }, ['voices']), 'read'),
  ...NOTEBOOK_ROUTES.map(route => operation(route.name, requestSchema, transferOutput, route.method === 'GET' ? 'read' : 'write')),
  operation('notebook.upload.begin', object({ name: { type: 'string', maxLength: 256 }, type: { type: 'string', maxLength: 128 }, size: { type: 'integer', minimum: 0, maximum: MAX_FILE_BYTES } }, ['name', 'type', 'size']), transferOutput),
  operation('notebook.upload.append', object({ transferId: idSchema, offset: { type: 'integer', minimum: 0, maximum: MAX_FILE_BYTES }, base64: { type: 'string', maxLength: 174764 } }, ['transferId', 'offset', 'base64']), object({ size: { type: 'integer' } }, ['size'])),
  operation('notebook.transfer.read', object({ transferId: idSchema, offset: { type: 'integer', minimum: 0, maximum: MAX_FILE_BYTES } }, ['transferId', 'offset']), object({ status: { type: 'integer' }, headers: { type: 'object', additionalProperties: { type: 'string' } }, base64: { type: 'string' }, done: { type: 'boolean' }, error: { type: 'string' } }, ['status', 'headers', 'base64', 'done', 'error']), 'read'),
  operation('notebook.transfer.close', object({ transferId: idSchema }, ['transferId']), object({ closed: { type: 'boolean' } }, ['closed'])),
];

type Port = Pick<NimiLocalAppIntegrationClient, 'registerProvider' | 'pollProvider' | 'completeProvider' | 'unregisterProvider'>;
type Transfer = { owner: string; kind: 'upload' | 'response'; file: FileHandle; filename: string; size: number; expected?: number; name?: string; type?: string; status: number; headers: Record<string, string>; done: boolean; error: string; busy: boolean; touched: number; controller: AbortController };

/** App business transport. The private HTTP secret is added only in this PC process. */
export function startNotebookProvider(integration: Port, workspace: () => Promise<{ apiUrl: string; token: string }>, temporaryRoot: string, onFailure: (error: unknown) => void, voices: () => Promise<readonly { voiceId: string; name: string }[]>) {
  const transfers = new Map<string, Transfer>();
  let stopped = false;
  let targetRef: string | null = null;
  const directory = mkdtemp(path.join(temporaryRoot, 'notebook-web-'));
  async function close(id: string) {
    const value = transfers.get(id);
    if (!value) return;
    transfers.delete(id); value.controller.abort();
    await value.file.close().catch(() => undefined);
    await rm(value.filename, { force: true }).catch(() => undefined);
  }
  function owned(id: string, owner: string, kind?: Transfer['kind']) {
    const value = transfers.get(id);
    if (!value || value.owner !== owner || (kind && value.kind !== kind)) throw new Error('NOTEBOOK_TRANSFER_UNAVAILABLE');
    value.touched = Date.now(); return value;
  }
  async function create(owner: string, kind: Transfer['kind']) {
    if (stopped || transfers.size >= 128 || [...transfers.values()].filter(t => t.owner === owner).length >= 64) throw new Error('NOTEBOOK_TRANSFER_BUSY');
    const transferId = randomUUID(); const filename = path.join(await directory, transferId);
    const file = await open(filename, 'wx+', 0o600);
    if (stopped) { await file.close(); await rm(filename, { force: true }); throw new Error('NOTEBOOK_SESSION_ENDED'); }
    const value: Transfer = { owner, kind, file, filename, size: 0, status: 0, headers: {}, done: false, error: '', busy: false, touched: Date.now(), controller: new AbortController() };
    transfers.set(transferId, value); return { transferId, value };
  }
  async function execute(route: typeof NOTEBOOK_ROUTES[number], input: NotebookRequest, value: Transfer) {
    const uploadIds: string[] = [];
    try {
      const worker = await workspace(); value.controller.signal.throwIfAborted();
      const names = [...route.path.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
      if (Object.keys(input.params ?? {}).some(key => !names.includes(key)) || names.some(key => typeof input.params?.[key] !== 'string' || !input.params[key] || /[\\/\x00]/.test(input.params[key]) || ['.', '..'].includes(input.params[key]))) throw new Error('NOTEBOOK_INVALID_RECORD');
      const endpoint = route.path.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(input.params![key]));
      const url = new URL(`/api${endpoint}`, worker.apiUrl);
      for (const [key, item] of Object.entries(input.query ?? {})) url.searchParams.set(key, item);
      let body: BodyInit | undefined;
      const headers: Record<string, string> = { 'X-Notebook-Process': worker.token };
      const takeUpload = (id: string) => {
        const upload = owned(id, value.owner, 'upload');
        if (upload.busy || upload.size !== upload.expected || upload.done) throw new Error('NOTEBOOK_UPLOAD_INCOMPLETE');
        upload.done = true; uploadIds.push(id); return upload;
      };
      if (input.bodyUploadId) {
        if (input.form || input.body !== undefined || route.method === 'GET') throw new Error('NOTEBOOK_INVALID_BODY');
        const upload = takeUpload(input.bodyUploadId);
        if (upload.type !== 'application/json') throw new Error('NOTEBOOK_INVALID_BODY');
        body = await openAsBlob(upload.filename, { type: 'application/json' });
        headers['Content-Type'] = 'application/json';
      } else if (input.form) {
        if (route.name !== 'notebook.sources.create' || input.body !== undefined) throw new Error('NOTEBOOK_INVALID_FORM');
        const form = new FormData();
        for (const part of input.form) {
          if (part.uploadId) {
            const upload = takeUpload(part.uploadId);
            form.append(part.name, await openAsBlob(upload.filename, { type: upload.type }), upload.name);
          } else if (part.textUploadId) {
            const upload = takeUpload(part.textUploadId);
            form.append(part.name, await (await openAsBlob(upload.filename)).text());
          } else if (typeof part.value === 'string') form.append(part.name, part.value);
          else throw new Error('NOTEBOOK_INVALID_FORM');
        }
        body = form;
      } else if (input.body !== undefined) { body = JSON.stringify(input.body); headers['Content-Type'] = 'application/json'; }
      const response = await fetch(url, { method: route.method, headers, body, signal: value.controller.signal, redirect: 'error' });
      value.status = response.status;
      for (const key of ['content-type', 'content-disposition', 'content-length']) { const header = response.headers.get(key); if (header) value.headers[key] = header; }
      if (response.body) for await (const chunk of response.body) {
        value.controller.signal.throwIfAborted();
        if (value.size + chunk.byteLength > MAX_FILE_BYTES) throw new Error('NOTEBOOK_RESPONSE_TOO_LARGE');
        let written = 0;
        while (written < chunk.byteLength) { const result = await value.file.write(chunk, written, chunk.byteLength - written, value.size); value.size += result.bytesWritten; written += result.bytesWritten; }
      }
    } catch (error) { value.error = error instanceof Error ? error.message : String(error); }
    finally { value.done = true; for (const id of uploadIds) await close(id); }
  }
  async function dispatch(call: NimiIntegrationProviderCall) {
    const input = JSON.parse(call.inputJson);
    const owner = call.consumerRef;
    if (!owner) throw new Error('NOTEBOOK_CONSUMER_REQUIRED');
    if (call.operation === 'notebook.podcasts.voices') return { voices: await voices() };
    const route = NOTEBOOK_ROUTES.find(item => item.name === call.operation);
    if (route) { const { transferId, value } = await create(owner, 'response'); void execute(route, input, value); return { transferId }; }
    if (call.operation === 'notebook.upload.begin') {
      const { transferId, value } = await create(owner, 'upload');
      value.name = path.basename(input.name); value.type = input.type; value.expected = input.size; return { transferId };
    }
    if (call.operation === 'notebook.upload.append') {
      const value = owned(input.transferId, owner, 'upload');
      const chunk = Buffer.from(input.base64, 'base64');
      if (value.busy || value.done || chunk.length > CHUNK_BYTES || chunk.toString('base64') !== input.base64 || input.offset !== value.size || value.size + chunk.length > value.expected!) throw new Error('NOTEBOOK_UPLOAD_OFFSET_INVALID');
      value.busy = true;
      try { let written = 0; while (written < chunk.length) { const result = await value.file.write(chunk, written, chunk.length - written, value.size); value.size += result.bytesWritten; written += result.bytesWritten; } return { size: value.size }; }
      finally { value.busy = false; }
    }
    if (call.operation === 'notebook.transfer.read') {
      const value = owned(input.transferId, owner, 'response');
      if (input.offset > value.size) throw new Error('NOTEBOOK_RESPONSE_OFFSET_INVALID');
      const buffer = Buffer.alloc(Math.min(CHUNK_BYTES, value.size - input.offset));
      const { bytesRead } = await value.file.read(buffer, 0, buffer.length, input.offset);
      return { status: value.status, headers: value.headers, base64: buffer.subarray(0, bytesRead).toString('base64'), done: value.done && input.offset + bytesRead === value.size, error: value.error };
    }
    if (call.operation === 'notebook.transfer.close') { owned(input.transferId, owner); await close(input.transferId); return { closed: true }; }
    throw new Error('NOTEBOOK_OPERATION_UNAVAILABLE');
  }
  const timer = setInterval(() => { for (const [id, value] of transfers) if (Date.now() - value.touched > 15 * 60_000) void close(id); }, 60_000); timer.unref();
  let phase = 'register';
  const settled = (async () => {
    const target = await integration.registerProvider({ integrationId: NOTEBOOK_INTEGRATION_ID, displayName: 'Open Notebook on this PC', operations: NOTEBOOK_PROVIDER_OPERATIONS, skill: 'Use the original PC notebooks, sources, notes, research, settings and podcast workflows. Business tasks and AI remain PC-owned. Explicit notebook.transfer.close stops an active response; background command and podcast lifecycles retain their separate controls. Upload and response handles are private to the verified consumer. No automatic replay.' });
    targetRef = target.targetRef;
    if (stopped) { await integration.unregisterProvider({ targetRef }); return; }
    phase = 'poll';
    while (!stopped) {
      const batch = await integration.pollProvider({ waitMs: 25_000 });
      if (stopped) break;
      for (const call of batch.calls) void dispatch(call).then(result => {
        if (!stopped) return integration.completeProvider({ callId: call.callId, resultJson: JSON.stringify(result), errorCode: '' });
      }, error => {
        if (!stopped) return integration.completeProvider({ callId: call.callId, resultJson: '', errorCode: error instanceof Error && /^NOTEBOOK_[A-Z_]+$/.test(error.message) ? error.message : 'NOTEBOOK_OPERATION_FAILED' });
      }).catch(onFailure);
    }
  })().catch(error => { if (!stopped) {
    const reason = (error as { reasonMetadata?: { integration_reason?: string } })?.reasonMetadata?.integration_reason;
    onFailure(new Error(`${phase}: ${error instanceof Error ? error.message : String(error)}${reason ? ` · ${reason}` : ''}`)); stop();
  } });
  function stop() {
    if (stopped) return;
    stopped = true; clearInterval(timer);
    for (const id of transfers.keys()) void close(id);
    void directory.then(dir => rm(dir, { recursive: true, force: true })).catch(() => undefined);
    if (targetRef) void integration.unregisterProvider({ targetRef }).catch(() => undefined);
  }
  return { stop, settled };
}
