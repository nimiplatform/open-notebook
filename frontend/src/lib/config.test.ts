import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setNotebookBackend } from '@/lib/nimi/client'
import { getConfig, resetConfig } from './config'

describe('Supervised notebook API origin', () => {
  beforeEach(() => { resetConfig(); vi.restoreAllMocks() })
  it('uses only the Host-selected workspace even with a public URL override', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://unrelated.example'
    setNotebookBackend('http://127.0.0.1:23456')
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ version: '1.14.0', dbStatus: 'online' })))
    expect((await getConfig()).apiUrl).toBe('http://127.0.0.1:23456')
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:23456/api/config')
    delete process.env.NEXT_PUBLIC_API_URL
  })
})
