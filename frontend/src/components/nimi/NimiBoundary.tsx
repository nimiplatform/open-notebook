'use client'
import { useEffect, useState } from 'react'
import { invokeShell } from '@nimiplatform/kit/shell/renderer/bridge'
import { getNimiClient, setNotebookBackend } from '@/lib/nimi/client'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Button } from '@/components/ui/button'

export function NimiBoundary({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [sessionBound, setSessionBound] = useState(false)
  const [error, setError] = useState('')
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
        let workspace: { apiUrl: string }
        try {
          workspace = await invokeShell<{ apiUrl: string }>('notebook.workspace', {})
        } catch (e) {
          // Continue observing Nimi authorization, but a failed App backend
          // needs the user's explicit retry instead of another process every 5s.
          workspaceError = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e)
          throw e
        }
        if (live) { setNotebookBackend(workspace.apiUrl); setReady(true); setError('') }
      } catch (e) { if (live) { setSessionBound(authorized); setReady(false); setError(e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e)) } }
      finally { checking = false }
    }
    void check()
    const timer = setInterval(check, 5000)
    return () => { live = false; clearInterval(timer) }
  }, [attempt])
  if (!mounted) return null
  if (ready) return children
  return <main className="min-h-screen grid place-items-center p-8"><section className="max-w-lg space-y-4">
    <h1 className="text-2xl font-semibold">{t('nimi.title')}</h1>
    {!sessionBound && <p>{t('nimi.connect')}</p>}
    <p className="text-sm text-muted-foreground">{t('nimi.storage')}</p>
    {error && <p role="alert" className="text-sm break-words">{error}</p>}
    <Button onClick={() => setAttempt(value => value + 1)}>{t('common.retry')}</Button>
  </section></main>
}
