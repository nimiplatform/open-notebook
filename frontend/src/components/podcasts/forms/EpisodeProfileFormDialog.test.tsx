import { useState } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { EpisodeProfileFormDialog } from './EpisodeProfileFormDialog'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

const createMutateAsync = vi.fn()
const languagesState = vi.hoisted(() => ({
  data: undefined as Array<{ code: string; name: string }> | undefined,
}))

vi.mock('@/lib/hooks/use-podcasts', () => ({
  useCreateEpisodeProfile: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateEpisodeProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLanguages: () => ({ data: languagesState.data }),
}))

vi.mock('@/lib/hooks/use-models', () => ({
  useModels: () => ({
    data: [{ id: 'model:nimi_language', name: 'Nimi · language', provider: 'nimi', type: 'language' }],
    isLoading: false,
  }),
}))

function DialogHarness() {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        reopen-dialog
      </button>
      <EpisodeProfileFormDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
        speakerProfiles={[
          {
            id: 'speaker_profile:solo',
            name: '潮桥播报员',
            description: '',
            voice_model: 'model:nimi_text_to_speech',
            speakers: [{ name: '林岚', voice_id: '', backstory: 'b', personality: 'p' }],
          },
        ]}
      />
    </div>
  )
}

describe('EpisodeProfileFormDialog language menu & Escape behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    languagesState.data = undefined
    document.body.style.pointerEvents = ''
  })

  it('provides fallback languages when /languages is unavailable and never leaves body pointer-events locked on Escape', async () => {
    render(<DialogHarness />)

    const languageTrigger = screen.getByRole('combobox', { name: 'podcasts.language' })
    fireEvent.keyDown(languageTrigger, { key: 'ArrowDown', code: 'ArrowDown' })

    // Built-in fallback options and explicit unset item are present even when /languages returned nothing
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Chinese \(China\) \(zh-CN\)/ })).toBeInTheDocument()
    })

    // Pressing Escape closes only the Select menu while keeping the Dialog open
    fireEvent.keyDown(document.activeElement ?? languageTrigger, {
      key: 'Escape',
      code: 'Escape',
    })

    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Chinese \(China\) \(zh-CN\)/ })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Pressing Escape again closes the Dialog and restores body pointer-events
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
      code: 'Escape',
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(document.body.style.pointerEvents).not.toBe('none')
  })
})
