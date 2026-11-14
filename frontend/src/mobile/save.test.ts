import { Blob as NativeBlob } from 'node:buffer'
import { afterEach, expect, it, vi } from 'vitest'
import { saveAndroidFile } from './save'

const files = vi.hoisted(() => ({ beginExport: vi.fn(), appendExport: vi.fn(), saveExport: vi.fn(), abortExport: vi.fn() }))
vi.mock('@capacitor/core', () => ({ registerPlugin: () => files }))
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })

function source() {
  vi.stubGlobal('Blob', NativeBlob)
  files.beginExport.mockResolvedValue({ id: 'local-save' })
  files.appendExport.mockResolvedValue({ received: 3 })
  files.abortExport.mockResolvedValue(undefined)
  return new NativeBlob(['abc'], { type: 'text/plain' }) as unknown as Blob
}

it('returns the actual renamed destination after the picker ends the old scope', async () => {
  const scope = new AbortController()
  files.saveExport.mockImplementation(async () => { scope.abort(); return { bytesWritten: 3, destinationName: '自定义原文 (1).txt' } })
  const result = await saveAndroidFile(source(), 'suggested.txt', scope.signal)
  expect(files.beginExport).toHaveBeenCalledWith({ name: 'suggested.txt', mimeType: 'text/plain', size: 3 })
  expect(files.appendExport).toHaveBeenCalledWith({ id: 'local-save', offset: 0, data: 'YWJj' })
  expect(result).toEqual({ canceled: false, destinationName: '自定义原文 (1).txt' })
})

it('does not fall back to the suggested name when URI metadata is unavailable', async () => {
  files.saveExport.mockResolvedValue({ bytesWritten: 3 })
  const result = await saveAndroidFile(source(), 'suggested.txt', new AbortController().signal)
  expect(result).toEqual({ canceled: false, destinationName: undefined })
})

it('keeps cancel and incomplete-write outcomes separate from success metadata', async () => {
  files.saveExport.mockRejectedValue(Object.assign(new Error('Canceled'), { code: 'NOTEBOOK_EXPORT_CANCELED' }))
  expect(await saveAndroidFile(source(), 'suggested.txt', new AbortController().signal)).toEqual({ canceled: true })
  files.saveExport.mockResolvedValue({ bytesWritten: 2, destinationName: 'renamed.txt' })
  await expect(saveAndroidFile(source(), 'suggested.txt', new AbortController().signal)).rejects.toThrow('NOTEBOOK_EXPORT_INCOMPLETE')
})
