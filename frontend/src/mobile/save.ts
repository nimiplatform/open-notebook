import { registerPlugin } from '@capacitor/core'
interface Files {
  beginExport(input: { name: string; mimeType: string; size: number }): Promise<{ id: string }>
  appendExport(input: { id: string; offset: number; data: string }): Promise<{ received: number }>
  saveExport(input: { id: string; size: number }): Promise<{ bytesWritten: number; destinationName?: string }>
  abortExport(input: { id: string }): Promise<void>
}
const files = registerPlugin<Files>('NotebookFiles')
export async function saveAndroidFile(source: Blob, name: string, signal: AbortSignal) {
  const body: Blob = Blob.prototype.slice.call(source, 0, source.size, source.type)
  signal.throwIfAborted()
  const { id } = await files.beginExport({ name, mimeType: body.type || 'application/octet-stream', size: body.size })
  let choosing = false, offset = 0
  try {
    while (offset < body.size) {
      signal.throwIfAborted()
      const bytes = new Uint8Array(await body.slice(offset, offset + 65536).arrayBuffer())
      let raw = ''; for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192))
      const result = await files.appendExport({ id, offset, data: btoa(raw) })
      if (result.received !== offset + bytes.length) throw new Error('NOTEBOOK_EXPORT_INCOMPLETE')
      offset += bytes.length
    }
    signal.throwIfAborted(); choosing = true
    const result = await files.saveExport({ id, size: offset })
    if (result.bytesWritten !== offset) throw new Error('NOTEBOOK_EXPORT_INCOMPLETE')
    return { canceled: false, destinationName: result.destinationName }
  } catch (error) {
    if (!choosing) await files.abortExport({ id }).catch(() => undefined)
    if ((error as { code?: string }).code === 'NOTEBOOK_EXPORT_CANCELED') return { canceled: true }
    throw error
  }
}
