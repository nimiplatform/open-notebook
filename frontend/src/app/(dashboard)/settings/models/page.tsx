'use client'
import { useEffect, useState } from 'react'
import { ModelConfigAIConfigSurface } from '@nimiplatform/kit/features/model-config/ui'
import type { NimiAIConfigSnapshot } from '@nimiplatform/sdk'
import { getNimiClient } from '@/lib/nimi/client'
import { useTranslation } from '@/lib/hooks/use-translation'
import { AppShell } from '@/components/layout/AppShell'

export default function ModelsPage() {
  const { t, language } = useTranslation()
  const capabilityLabels: Record<string, string> = {
    'text.generate': t('nimi.research'), 'text.embed': t('nimi.embedding'),
    'audio.transcribe': t('nimi.transcription'), 'audio.synthesize': t('nimi.narration'),
  }
  const [snapshot, setSnapshot] = useState<NimiAIConfigSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const refresh = async () => {
    setLoading(true); setError(null)
    try { setSnapshot(await getNimiClient().aiConfig.get()) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])
  return <AppShell><div className="w-full mx-auto max-w-4xl space-y-6 overflow-y-auto p-6">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">{t('navigation.models')}</h1><p className="text-muted-foreground">{t('nimi.models')}</p></header>
    <ModelConfigAIConfigSurface
      copy={{
        title: t('navigation.models'), backLabel: t('common.back'),
        detailTitle: label => `${label} · ${t('navigation.settings')}`,
        activeModelLabel: t('chat.model'), modelPickerTitle: t('models.selectModelPlaceholder'),
        modelPickerSearchPlaceholder: t('common.search'),
        saveLocalLabel: t('common.save'), saveCloudLabel: t('common.save'),
        cancelLabel: t('common.cancel'), confirmSelectionLabel: t('common.confirm'),
        notConfiguredLabel: t('podcasts.notConfigured'),
        capabilityLabel: (capability, fallback) => capabilityLabels[capability] ?? fallback,
        capabilityDescription: () => '',
      }}
      context={{ owner: 'app-ai-config', appId: 'io.github.nimiplatform.open-notebook' }}
      capabilityContracts={['text.generate', 'text.embed', 'audio.transcribe', 'audio.synthesize']}
      initialCapabilityContract="text.generate" language={language}
      capabilities={snapshot?.config ? snapshot.config.capabilities : snapshot ? null : undefined}
      revision={snapshot?.revision} effectiveSelections={snapshot?.effectiveSelections}
      listOptions={query => getNimiClient().aiConfig.listOptions(query)} loading={loading} loadError={error}
      onRetry={() => { void refresh() }} onOverwrite={async input => { const result = await getNimiClient().aiConfig.overwrite(input); await refresh(); return result }}
    />
  </div></AppShell>
}
