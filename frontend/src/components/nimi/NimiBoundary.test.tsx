import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NimiBoundary } from './NimiBoundary'

const { status, invoke } = vi.hoisted(() => ({ status: vi.fn(), invoke: vi.fn() }))
vi.mock('@nimiplatform/kit/shell/renderer/bridge', () => ({ invokeShell: invoke }))
vi.mock('@/lib/nimi/client', () => ({
  getNimiClient: () => ({ auth: { status } }),
  setNotebookBackend: vi.fn(),
}))

describe('Nimi workspace startup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    status.mockResolvedValue({ sessionBound: true })
  })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('does not restart a failed backend during authorization polling', async () => {
    invoke.mockRejectedValue(new Error('Notebook backend failed'))
    render(<NimiBoundary><div>Notebook workspace</div></NimiBoundary>)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('alert')).toHaveTextContent('Notebook backend failed')
    expect(screen.queryByText('nimi.connect')).not.toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    expect(status).toHaveBeenCalledTimes(4)
    expect(invoke).toHaveBeenCalledTimes(1)

    invoke.mockResolvedValue({ apiUrl: 'http://127.0.0.1:12345' })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'common.retry' })) })
    expect(invoke).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Notebook workspace')).toBeInTheDocument()
  })

  it('does not start the workspace before Nimi authorization is bound', async () => {
    status.mockResolvedValue({ sessionBound: false, reasonCode: 'session-unavailable', actionHint: 'open_desktop' })
    render(<NimiBoundary><div>Notebook workspace</div></NimiBoundary>)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(invoke).not.toHaveBeenCalled()
    expect(screen.getByText('nimi.connect')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('session-unavailable')
  })
})
