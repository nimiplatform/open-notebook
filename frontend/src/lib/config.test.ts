import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/lib/api/client'
import { setNotebookBackend } from '@/lib/nimi/client'
import { getApiUrl, getConfig, resetConfig } from './config'

const firstBackend = 'http://127.0.0.1:23456'
const nextBackend = 'http://127.0.0.1:34567'
const response = (version = '1.14.1') => new Response(JSON.stringify({ version, dbStatus: 'online' }))

describe('Supervised notebook API origin', () => {
  beforeEach(() => { resetConfig(); setNotebookBackend(firstBackend) })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })
  it('uses only the Host-selected workspace even with a public URL override', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://unrelated.example')
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response())
    expect((await getConfig()).apiUrl).toBe(firstBackend)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher.mock.calls[0][0]).toBe(`${firstBackend}/api/config`)
  })

  it('routes ordinary API requests to the new backend after a restart', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response())
    await getConfig()
    setNotebookBackend(nextBackend)

    const result = await apiClient.get('/notebooks', {
      adapter: async config => ({ data: [], status: 200, statusText: 'OK', headers: {}, config }),
    })
    expect(result.config.baseURL).toBe(`${nextBackend}/api`)
    expect(await getApiUrl()).toBe(nextBackend)
    expect((await getConfig()).apiUrl).toBe(nextBackend)
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      `${firstBackend}/api/config`, `${nextBackend}/api/config`,
    ])
  })

  it('keeps the current configuration when an old backend responds late', async () => {
    let finishOld!: (value: Response) => void
    const fetcher = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce(response('new'))
    const oldRequest = getConfig()
    setNotebookBackend(nextBackend)
    expect((await getConfig()).version).toBe('new')

    finishOld(response('old'))
    await oldRequest
    expect((await getConfig()).version).toBe('new')
    expect(await getApiUrl()).toBe(nextBackend)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('allows an explicit retry after a failed configuration request', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Backend disconnected'))
      .mockResolvedValueOnce(response())
    await expect(getConfig()).rejects.toThrow('Backend disconnected')
    expect(fetcher).toHaveBeenCalledOnce()
    expect((await getConfig()).apiUrl).toBe(firstBackend)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not clear the new configuration when the old request fails', async () => {
    let failOld!: (reason: Error) => void
    const fetcher = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => new Promise((_, reject) => { failOld = reject }))
      .mockResolvedValueOnce(response('new'))
    const oldRequest = getConfig()
    const failure = expect(oldRequest).rejects.toThrow('Backend disconnected')
    setNotebookBackend(nextBackend)
    await getConfig()

    failOld(new Error('Backend disconnected'))
    await failure
    expect((await getConfig()).version).toBe('new')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
