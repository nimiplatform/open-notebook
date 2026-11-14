'use client'
import type { NimiAppScope } from '@nimiplatform/kit/core/app-session'
import { CHUNK_BYTES, NOTEBOOK_INTEGRATION_ID, findNotebookRoute, type NotebookRequest } from '../../../../src-electron/notebook-contract'

export const isNotebookWeb = process.env.NEXT_PUBLIC_NIMI_WEB === '1'
let scope: NimiAppScope | null = null
let targetRef: string | null = null
/** A document binds once. A replacement scope requires a new document. */
export function bindNotebookWebScope(value: NimiAppScope) {
  if (scope && scope !== value) throw new Error('NOTEBOOK_DOCUMENT_SCOPE_CHANGED')
  scope = value
}
function capturedScope() {
  if (!scope || scope.signal.aborted) throw new Error('NOTEBOOK_SESSION_ENDED')
  return scope
}
const pause = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  signal.throwIfAborted()
  const abort = () => { clearTimeout(timer); reject(signal.reason) }
  const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
  signal.addEventListener('abort', abort, { once: true })
})
async function call(captured: NimiAppScope, selected: string, operation: string, input: unknown, signal = captured.signal) {
  signal.throwIfAborted()
  const api = captured.client.integration
  // JSON-only envelopes use a realm-independent plain record. The captured
  // public client still owns validation and authority; no client is rebound.
  let result = await api.invoke(Object.assign(Object.create(null), { targetRef: selected, operation, inputJson: JSON.stringify(input) }))
  while (result.status === 'accepted') { await pause(100, captured.signal); result = await api.getCall(Object.assign(Object.create(null), { callId: result.callId })); captured.signal.throwIfAborted() }
  if (result.status !== 'completed') throw new Error(result.errorCode || `NOTEBOOK_${result.status.toUpperCase()}`)
  const output = JSON.parse(result.resultJson)
  if (signal.aborted) {
    if (typeof output.transferId === 'string') await call(captured, selected, 'notebook.transfer.close', { transferId: output.transferId }).catch(() => undefined)
    signal.throwIfAborted()
  }
  return output
}
export async function connectNotebookWorkspace() {
  const captured = capturedScope()
  const rows = (await captured.client.integration.listCatalog()).filter(row => row.integrationId === NOTEBOOK_INTEGRATION_ID && row.available)
  captured.signal.throwIfAborted()
  if (!rows.length) throw new Error('NOTEBOOK_PC_APP_UNAVAILABLE')
  const allowed = rows.filter(row => row.permittedOperations.includes('notebook.workspace.config') && row.permittedOperations.includes('notebook.transfer.read') && row.permittedOperations.includes('notebook.transfer.close'))
  if (!allowed.length) throw new Error('NOTEBOOK_PERMISSION_REQUIRED')
  if (allowed.length !== 1) throw new Error('NOTEBOOK_TARGET_AMBIGUOUS')
  targetRef = allowed[0].targetRef
  return targetRef
}
function selectedWorkspace() {
  const captured = capturedScope()
  if (!targetRef) throw new Error('NOTEBOOK_PC_APP_UNAVAILABLE')
  return { captured, selected: targetRef }
}
export async function notebookWebVoices(): Promise<readonly { voiceId: string; name: string }[]> {
  const { captured, selected } = selectedWorkspace()
  const result = await call(captured, selected, 'notebook.podcasts.voices', {})
  if (!Array.isArray(result.voices) || result.voices.some((v: { voiceId?: unknown; name?: unknown }) => typeof v.voiceId !== 'string' || typeof v.name !== 'string')) throw new Error('NOTEBOOK_INVALID_VOICES')
  return result.voices
}
const toBase64 = (bytes: Uint8Array) => { let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte); return btoa(raw) }
const fromBase64 = (text: string) => Uint8Array.from(atob(text), char => char.charCodeAt(0))
type ResponseChunk = { status: number; headers: Record<string, string>; base64: string; done: boolean; error: string }
function readChunk(value: unknown): ResponseChunk {
  const data = value as ResponseChunk
  if (!data || !Number.isInteger(data.status) || data.status < 0 || data.status > 599 || typeof data.base64 !== 'string' || data.base64.length > 174764 || typeof data.done !== 'boolean' || typeof data.error !== 'string' || !data.headers || Object.values(data.headers).some(v => typeof v !== 'string')) throw new Error('NOTEBOOK_INVALID_RESPONSE')
  return data
}
/** Same App business API as native, carried by public Integration operations. */
export async function notebookFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!isNotebookWeb) return fetch(url, options)
  const { captured, selected } = selectedWorkspace()
  const signal = options.signal ? AbortSignal.any([captured.signal, options.signal]) : captured.signal
  const endpoint = new URL(url, window.location.origin)
  if (endpoint.origin !== window.location.origin || !endpoint.pathname.startsWith('/api/')) throw new Error('NOTEBOOK_OPERATION_UNAVAILABLE')
  const { route, params } = findNotebookRoute(options.method || 'GET', endpoint.pathname.slice(4))
  const input: NotebookRequest = { params, query: Object.fromEntries(endpoint.searchParams) }
  const uploads: string[] = []
  const release = (id: string) => call(captured, selected, 'notebook.transfer.close', { transferId: id }).catch(() => undefined)
  async function upload(part: Blob, name: string) {
    const result = await call(captured, selected, 'notebook.upload.begin', { name, type: part.type, size: part.size }, signal)
    const id = String(result.transferId); uploads.push(id)
    for (let offset = 0; offset < part.size; offset += CHUNK_BYTES) {
      const chunk = new Uint8Array(await part.slice(offset, offset + CHUNK_BYTES).arrayBuffer())
      await call(captured, selected, 'notebook.upload.append', { transferId: id, offset, base64: toBase64(chunk) }, signal)
    }
    return id
  }
  try {
    if (options.body instanceof FormData) {
      input.form = []
      let inlineBytes = 0
      for (const [name, part] of options.body) {
        if (typeof part === 'string') {
          const size = new TextEncoder().encode(part).byteLength
          if (inlineBytes + size > 128 * 1024) input.form.push({ name, textUploadId: await upload(new Blob([part], { type: 'text/plain' }), name) })
          else { inlineBytes += size; input.form.push({ name, value: part }) }
        } else input.form.push({ name, uploadId: await upload(part, part.name) })
      }
    } else if (options.body !== undefined && options.body !== null) {
      if (typeof options.body !== 'string') throw new Error('NOTEBOOK_INVALID_BODY')
      const body = new Blob([options.body], { type: 'application/json' })
      if (body.size > 128 * 1024) input.bodyUploadId = await upload(body, 'notebook-request.json')
      else input.body = JSON.parse(options.body)
    }
    const result = await call(captured, selected, route.name, input, signal)
    const id = String(result.transferId)
    let offset = 0
    const next = async () => {
      const chunk = readChunk(await call(captured, selected, 'notebook.transfer.read', { transferId: id, offset }, signal))
      if (chunk.error) throw new Error(chunk.error)
      return chunk
    }
    let first: ResponseChunk
    try { do { first = await next(); if (!first.status) await pause(150, signal) } while (!first.status) }
    catch (error) { await release(id); throw error }
    let pending: ResponseChunk | null = first
    let finished = false
    const stop = () => { if (!finished) { finished = true; void release(id) } }
    signal.addEventListener('abort', stop, { once: true })
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          signal.throwIfAborted()
          let chunk = pending || await next(); pending = null
          while (!chunk.base64 && !chunk.done) { await pause(150, signal); chunk = await next() }
          if (chunk.base64) { const bytes = fromBase64(chunk.base64); offset += bytes.length; controller.enqueue(bytes) }
          if (chunk.done) { controller.close(); stop(); signal.removeEventListener('abort', stop) }
        } catch (error) { controller.error(error); stop(); signal.removeEventListener('abort', stop) }
      },
      cancel() { stop(); signal.removeEventListener('abort', stop) },
    })
    if ([204, 205, 304].includes(first.status)) { await stream.cancel(); return new Response(null, { status: first.status, headers: first.headers }) }
    return new Response(stream, { status: first.status, headers: first.headers })
  } catch (error) { for (const id of uploads) await release(id); throw error }
}
