'use client'
// @nimi-authority: rule.nimi.platform.ui-design-system.remote-app-session
import { useEffect, useState } from 'react'
import { createWebNimiAppSession, type NimiRemoteAppConfig } from '@nimiplatform/kit/auth/app/web'
import { NimiAppSessionProvider, NimiAccountControl, NimiAppAccessGate } from '@nimiplatform/kit/auth/app'
import { bindNotebookWebScope, connectNotebookWorkspace } from '@/lib/nimi/web-transport'
import { setNotebookBackend } from '@/lib/nimi/client'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Button } from '@/components/ui/button'

type Session = ReturnType<typeof createWebNimiAppSession>
let documentSession: Session | null = null
let documentStarted = false
function getDocumentSession() {
  if (documentSession) return documentSession
  const config = JSON.parse(process.env.NEXT_PUBLIC_NIMI_WEB_CONFIG || '{}') as NimiRemoteAppConfig
  const active = createWebNimiAppSession(config)
  documentSession = active
  let bound: string | null = null
  active.subscribe(() => {
    const state = active.getSnapshot()
    if (state.runtime.status === 'connected') {
      if (bound && bound !== state.runtime.scope.viewKey) { window.location.replace('/'); return }
      bound = state.runtime.scope.viewKey
      bindNotebookWebScope(state.runtime.scope)
    }
  })
  // Kit owns pagehide disposal. React development effect replay must not
  // consume an OAuth callback twice or dispose the active document session.
  return active
}
export function NimiWebBoundary({ children }: { children: React.ReactNode }) {
  const { language } = useTranslation()
  const [session] = useState(getDocumentSession)
  useEffect(() => {
    if (!documentStarted) { documentStarted = true; void session.start() }
  }, [session])
  return <NimiAppSessionProvider session={session}>
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex min-h-12 shrink-0 items-center justify-end gap-3 border-b px-3 py-2"><NimiAccountControl hideSignedOut language={language.startsWith('zh') ? 'zh' : 'en'} /></header>
      <div className="min-h-0 flex-1 flex flex-col"><NimiAppAccessGate externalAccountControl title="Open Notebook" language={language.startsWith('zh') ? 'zh' : 'en'}>{() => <NotebookWorkspace>{children}</NotebookWorkspace>}</NimiAppAccessGate></div>
    </div>
  </NimiAppSessionProvider>
}
function NotebookWorkspace({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    void connectNotebookWorkspace().then(() => { if (live) { setNotebookBackend(window.location.origin); setReady(true); setError('') } }, error => { if (live) setError(error instanceof Error ? error.message : String(error)) })
    return () => { live = false }
  }, [attempt])
  if (ready) return children
  return <main className="grid flex-1 place-items-center p-6"><section className="max-w-xl space-y-4">
    <h1 className="text-2xl font-semibold">{t('nimi.webWorkspace')}</h1>
    <p>{t('nimi.webConnect')}</p><p className="text-sm text-muted-foreground">{t('nimi.webStorage')}</p>
    {error && <p role="alert" className="break-words text-sm">{error === 'NOTEBOOK_PERMISSION_REQUIRED' ? t('nimi.webPermission') : error === 'NOTEBOOK_PC_APP_UNAVAILABLE' ? t('nimi.webUnavailable') : error}</p>}
    <Button onClick={() => { setError(''); setAttempt(value => value + 1) }}>{t('common.retry')}</Button>
  </section></main>
}
