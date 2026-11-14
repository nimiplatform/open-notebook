'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { invokeShell } from '@nimiplatform/kit/shell/renderer/bridge'
import { getNimiClient, setNotebookBackend } from '@/lib/nimi/client'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Button } from '@/components/ui/button'

const WebBoundary = dynamic(() => import('./NimiWebBoundary').then(module => module.NimiWebBoundary), { ssr: false })
export function NimiBoundary({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_NIMI_WEB === '1') return <WebBoundary>{children}</WebBoundary>
  return <NativeBoundary>{children}</NativeBoundary>
}
function NativeBoundary({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [sessionBound, setSessionBound] = useState(false)
  const [error, setError] = useState('')
  const [remoteError, setRemoteError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setMounted(true)
    let live = true
    let checking = false
    let workspaceError = ''
    const check = async () => {
      if (checking) return
      checking = true
      let authorized = false
      try {
        const status = await getNimiClient().auth.status()
        if (!live) return
        authorized = status.sessionBound
        setSessionBound(authorized)
        if (!status.sessionBound) throw new Error(`${status.reasonCode} · ${status.actionHint}`)
        if (workspaceError) { setError(workspaceError); return }
        let workspace: { apiUrl: string; remoteAccessError?: string }
        try {
          workspace = await invokeShell<{ apiUrl: string; remoteAccessError?: string }>('notebook.workspace', {})
        } catch (e) {
          // Continue observing Nimi authorization, but a failed App backend
          // needs the user's explicit retry instead of another process every 5s.
          workspaceError = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e)
          throw e
        }
        if (live) { setRemoteError(workspace.remoteAccessError || ''); setNotebookBackend(workspace.apiUrl); setReady(true); setError('') }
      } catch (e) { if (live) { setSessionBound(authorized); setReady(false); setError(e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e)) } }
      finally { checking = false }
    }
    void check()
    const timer = setInterval(check, 5000)
    return () => { live = false; clearInterval(timer) }
  }, [attempt])
  if (!mounted) return null
  if (ready) return <div className="flex h-dvh flex-col overflow-hidden">{remoteError && <aside role="status" className="shrink-0 border-b bg-muted p-3 text-sm"><strong>{t('nimi.webProviderFailed')}</strong><details><summary>{t('nimi.webDetails')}</summary><p className="break-words">{remoteError}</p></details></aside>}<div className="min-h-0 flex-1">{children}</div></div>
  return <main className="min-h-screen grid place-items-center p-8"><section className="max-w-lg space-y-4">
    <h1 className="text-2xl font-semibold">{t('nimi.title')}</h1>
    {!sessionBound && <p>{t('nimi.connect')}</p>}
    <p className="text-sm text-muted-foreground">{t('nimi.storage')}</p>
    {error && <p role="alert" className="text-sm break-words">{error}</p>}
    <Button onClick={() => setAttempt(value => value + 1)}>{t('common.retry')}</Button>
  </section></main>
}
