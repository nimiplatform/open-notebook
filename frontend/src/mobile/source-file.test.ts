import { createRequire } from 'node:module'
import { expect, it, vi } from 'vitest'
import { sourcesApi } from '@/lib/api/sources'
import apiClient from '@/lib/api/client'
import { fileInSourceDocument } from './SourceFileInput'
vi.mock('@/lib/api/client', () => ({ default: { post: vi.fn(async () => ({ data: {} })) } }))
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new () => { window: { File: typeof File; close(): void } } }

it('a real File from the identity document reaches the original source multipart request with unchanged bytes and metadata', async () => {
  const parent = new JSDOM()
  const bytes = new Uint8Array([0, 255, 128, 10, 226, 130, 172])
  const selected = new parent.window.File([bytes], 'source-original.txt', { type: 'text/plain;charset=utf-8', lastModified: 123456789 })
  expect(selected instanceof File).toBe(false)
  const received = fileInSourceDocument(selected)
  expect(received instanceof File).toBe(true)
  expect(received.name).toBe(selected.name)
  expect(received.type).toBe(selected.type)
  expect(received.lastModified).toBe(selected.lastModified)
  await sourcesApi.create({ type: 'upload', title: 'Original title', notebooks: ['notebook:original'], transformations: [], embed: false, async_processing: true, file: received })
  const form = vi.mocked(apiClient.post).mock.calls.at(-1)![1] as FormData
  const uploaded = form.get('file') as File
  expect(uploaded instanceof File).toBe(true)
  expect(form.get('notebooks')).toBe('["notebook:original"]')
  expect(form.get('embed')).toBe('false')
  const restored = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(uploaded)
  })
  expect(Array.from(new Uint8Array(restored))).toEqual(Array.from(bytes))
  parent.window.close()
})
