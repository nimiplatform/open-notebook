import { StrictMode } from 'react'
import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const { create, start, dispose } = vi.hoisted(() => ({ create: vi.fn(), start: vi.fn(async () => undefined), dispose: vi.fn() }))
vi.mock('@nimiplatform/kit/auth/app/web', () => ({ createWebNimiAppSession: create }))
vi.mock('@nimiplatform/kit/auth/app', () => ({
  NimiAppSessionProvider: ({ children }: { children: React.ReactNode }) => children,
  NimiAccountControl: () => null,
  NimiAppAccessGate: () => <div>Official gate</div>,
}))
vi.mock('@/lib/hooks/use-translation', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
vi.mock('@/lib/nimi/web-transport', () => ({ bindNotebookWebScope: vi.fn(), connectNotebookWorkspace: vi.fn() }))
vi.mock('@/lib/nimi/client', () => ({ setNotebookBackend: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllEnvs() })

it('owns one Kit session per document across React development effect replay and route remount', async () => {
  create.mockReturnValue({ start, dispose, subscribe: () => () => undefined })
  vi.stubEnv('NEXT_PUBLIC_NIMI_WEB_CONFIG', '{}')
  const { NimiWebBoundary } = await import('./NimiWebBoundary')
  const first = render(<StrictMode><NimiWebBoundary>Notebook</NimiWebBoundary></StrictMode>)
  expect(create).toHaveBeenCalledTimes(1)
  expect(start).toHaveBeenCalledTimes(1)
  first.unmount()
  render(<StrictMode><NimiWebBoundary>Notebook again</NimiWebBoundary></StrictMode>)
  expect(create).toHaveBeenCalledTimes(1)
  expect(start).toHaveBeenCalledTimes(1)
  expect(dispose).not.toHaveBeenCalled()
})
