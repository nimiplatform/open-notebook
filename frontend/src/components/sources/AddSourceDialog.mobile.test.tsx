import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { AddSourceDialog } from './AddSourceDialog'

const fixture = vi.hoisted(() => ({
  draft: { open: true, step: 1, values: { type: 'upload', title: 'Retained title', embed: false, async_processing: true }, notebooks: ['notebook:original'], transformations: [] },
  settings: { default_embedding_option: 'always' }, notebooks: [{ id: 'notebook:original', name: 'Original notebook' }],
  transformations: [{ id: 'transformation:default', name: 'Default', apply_default: true }],
  choose: vi.fn(), input: vi.fn(), remember: vi.fn(), create: vi.fn(),
}))
vi.mock('@/mobile/bridge', () => ({ sourceDraft: () => fixture.draft, rememberSourceDraft: (...args: unknown[]) => fixture.remember(...args), isNotebookMobile: () => true, mobileServices: () => ({ choose: fixture.choose, input: fixture.input }) }))
vi.mock('@/lib/hooks/use-settings', () => ({ useSettings: () => ({ data: fixture.settings }) }))
vi.mock('@/lib/hooks/use-notebooks', () => ({ useNotebooks: () => ({ data: fixture.notebooks }) }))
vi.mock('@/lib/hooks/use-transformations', () => ({ useTransformations: () => ({ data: fixture.transformations }) }))
vi.mock('@/lib/hooks/use-sources', () => ({ useCreateSource: () => ({ mutateAsync: fixture.create }) }))

it('restores the original source form and choices before a picker return, without creating a source', async () => {
  function Parent() {
    const [open, setOpen] = useState(false)
    return <AddSourceDialog open={open} onOpenChange={setOpen} defaultNotebookId="notebook:original" />
  }
  render(<Parent />)
  const input = await screen.findByLabelText('sources.fileLabel')
  fireEvent.click(input)
  expect(fixture.choose).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ key: 'source:notebook:original', multiple: true }))
  await waitFor(() => expect(fixture.remember).toHaveBeenLastCalledWith('source:notebook:original', expect.objectContaining({
    open: true, values: expect.objectContaining({ type: 'upload', title: 'Retained title', embed: false }), notebooks: ['notebook:original'], transformations: [],
  })))
  expect(fixture.input).toHaveBeenCalledWith('source:notebook:original', expect.any(Function))
  expect(fixture.create).not.toHaveBeenCalled()
})
