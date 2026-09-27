import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ModelsPage from './page'
vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: {children: React.ReactNode}) => children }))
vi.mock('@/lib/nimi/client', () => ({ getNimiClient: () => ({ aiConfig: { get: async () => { throw new Error('session-invalid') } } }) }))
vi.mock('@nimiplatform/kit/features/model-config/ui', () => ({ ModelConfigAIConfigSurface: ({ loadError }: {loadError: string}) => <div role="alert">{loadError}</div> }))
describe('Nimi Models', () => {
  it('reports unavailable protected configuration without a provider fallback', async () => {
    render(<ModelsPage />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('session-invalid'))
    expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument()
  })
})
