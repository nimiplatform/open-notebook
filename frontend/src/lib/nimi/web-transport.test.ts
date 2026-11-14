import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NimiAppScope } from '@nimiplatform/kit/core/app-session'

beforeEach(() => { vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_NIMI_WEB', '1'); vi.stubGlobal('Blob', NodeBlob) })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

async function setup() {
  const transport = await import('./web-transport')
  const controller = new AbortController()
  const requests: { operation: string; input: Record<string, unknown> }[] = []
  let responseSent = false
  const integration = {
    listCatalog: async () => [{ integrationId: 'io.github.nimiplatform.open-notebook.workspace.v1', available: true, targetRef: 'verified-pc', permittedOperations: ['notebook.workspace.config', 'notebook.transfer.read', 'notebook.transfer.close'] }],
    invoke: vi.fn(async ({ operation, inputJson }: { operation: string; inputJson: string }) => {
      requests.push({ operation, input: JSON.parse(inputJson) })
      let output: object = { transferId: 'response-a' }
      if (operation === 'notebook.transfer.read') {
        output = { status: 200, headers: { 'content-type': 'application/json' }, base64: responseSent ? '' : btoa('{"ok":true}'), done: true, error: '' }; responseSent = true
      } else if (operation === 'notebook.transfer.close') output = { closed: true }
      return { status: 'completed', resultJson: JSON.stringify(output), callId: 'runtime-call-a' }
    }),
  }
  const scope = { client: { integration }, signal: controller.signal, viewKey: 'scope-a' } as unknown as NimiAppScope
  transport.bindNotebookWebScope(scope); await transport.connectNotebookWorkspace()
  return { transport, controller, requests, scope }
}

describe('Notebook Web public business transport', () => {
  it('maps the original API request to a fixed named operation and reads its actual response bytes', async () => {
    const { transport, requests } = await setup()
    const response = await transport.notebookFetch(`${location.origin}/api/notes/note:abc?notebook_id=notebook:123`)
    expect(await response.json()).toEqual({ ok: true })
    expect(requests[0]).toEqual({ operation: 'notebook.notes.get', input: { params: { id: 'note:abc' }, query: { notebook_id: 'notebook:123' } } })
    await vi.waitFor(() => expect(requests.at(-1)?.operation).toBe('notebook.transfer.close'))
  })

  it('rejects arbitrary URLs and refuses to bind old callbacks to a replacement scope', async () => {
    const { transport, controller, requests, scope } = await setup()
    await expect(transport.notebookFetch('http://127.0.0.1:8000/api/notes')).rejects.toThrow('NOTEBOOK_OPERATION_UNAVAILABLE')
    controller.abort()
    await expect(transport.notebookFetch(`${location.origin}/api/notes`)).rejects.toThrow('NOTEBOOK_SESSION_ENDED')
    expect(() => transport.bindNotebookWebScope({ ...scope, signal: new AbortController().signal, viewKey: 'scope-b' })).toThrow('NOTEBOOK_DOCUMENT_SCOPE_CHANGED')
    expect(requests).toHaveLength(0)
  })

  it('chunks large UTF-8 request bodies before invoking the notebook business operation', async () => {
    const { transport, requests } = await setup()
    const response = await transport.notebookFetch(`${location.origin}/api/chat/execute`, { method: 'POST', body: JSON.stringify({ message: '资料'.repeat(45000) }) })
    await response.text()
    expect(requests[0].operation).toBe('notebook.upload.begin')
    const append = requests.filter(row => row.operation === 'notebook.upload.append')
    expect(append.length).toBeGreaterThan(1)
    expect(append.every(row => JSON.stringify(row.input).length < 256 * 1024)).toBe(true)
    const start = requests.find(row => row.operation === 'notebook.chat.execute')!
    expect(start.input.bodyUploadId).toBe('response-a')
    expect(start.input.body).toBeUndefined()
  })
})
