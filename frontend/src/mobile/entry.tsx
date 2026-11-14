import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { createMobileNimiAppSession } from '@nimiplatform/kit/auth/app/mobile'
import { NimiAppAccessGate, NimiAccountControl, NimiAppSessionProvider, useNimiAppSession } from '@nimiplatform/kit/auth/app'
import type { NimiAppScope } from '@nimiplatform/kit/core/app-session'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { I18nProvider } from '@/components/providers/I18nProvider'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NotebookMobileState } from './state'
import { saveAndroidFile } from './save'
import './bridge'
import './mobile.css'
const session = createMobileNimiAppSession(__NOTEBOOK_MOBILE_CONFIG__)

function Workspace({ scope, state, save }: { scope: NimiAppScope; state: NotebookMobileState; save: (blob: Blob, name: string, signal: AbortSignal) => Promise<{ canceled: boolean }> }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState('')
  const { t } = useTranslation()
  useEffect(() => {
    let attached = false
    const ready = (event: MessageEvent) => {
      if (attached || scope.signal.aborted || event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data !== 'notebook-mobile-ready') return
      attached = true
      const child = frame.current.contentWindow!
      const live = () => !scope.signal.aborted && child === frame.current?.contentWindow
      // One already scoped public client, once, to one same-origin document.
      child.acceptNotebookScope!(scope, {
        ready: target => { if (!live()) throw new Error('NOTEBOOK_SESSION_ENDED'); return state.bind({ target, view: scope.viewKey, signal: scope.signal }) },
        navigate: path => { if (live()) state.navigate(path, scope.viewKey) },
        draft: (key, value) => { if (live()) state.draft(key, value, scope.viewKey) },
        input: (key, deliver) => { if (live()) state.input(key, deliver, scope.viewKey) },
        choose: intent => { if (live()) state.choose(intent, scope.viewKey) },
        save: (blob, name) => { if (!live()) throw new Error('NOTEBOOK_SESSION_ENDED'); return save(blob, name, scope.signal) },
        failed: message => { if (live()) setError(message) },
      })
    }
    window.addEventListener('message', ready)
    return () => window.removeEventListener('message', ready)
  }, [scope, state, save])
  return <>{error && <section className="notebook-mobile-notice" role="alert"><p>{error}</p><p>{t('nimi.mobileConnect')}</p>
    <Button onClick={() => { session.disconnectRuntime(); void session.connectRuntime() }}>{t('common.retry')}</Button></section>}
    <iframe ref={frame} src="/workspace.html" title={t('common.appName')} inert={!!error} />
  </>
}
function IdentityWorkspace({ identity }: { identity: { signal: AbortSignal } }) {
  const { t, language } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [state] = useState(() => new NotebookMobileState(identity.signal, intent => {
    if (!input.current) throw new Error('NOTEBOOK_FILE_INPUT_UNAVAILABLE')
    input.current.accept = intent.accept; input.current.multiple = intent.multiple; input.current.click()
  }))
  const [saved, setSaved] = useState<{ kind: string; name: string; error?: string }>()
  const [save] = useState(() => async (blob: Blob, name: string, signal: AbortSignal) => {
    // Local Save completion belongs to the identity, including its system-dialog lifetime.
    setSaved({ kind: 'saving', name })
    try {
      const result = await saveAndroidFile(blob, name, signal)
      if (!identity.signal.aborted) setSaved({ kind: result.canceled ? 'canceled' : 'saved', name })
      return result
    } catch (error) { if (!identity.signal.aborted) setSaved({ kind: 'error', name, error: String(error) }); throw error }
  })
  useSyncExternalStore(state.subscribe, state.getRevision)
  const selection = state.selection
  return <>
    <input ref={input} hidden type="file" aria-label={t('sources.uploadFile')} onChange={event => { const files = Array.from(event.currentTarget.files || []); event.currentTarget.value = ''; state.selected(files) }} />
    {selection && <section className="notebook-mobile-notice" aria-live="polite"><strong>{selection.files.map(file => file.name).join(', ')}</strong><p>{t('nimi.mobileFiles')}</p>
      <div><Button disabled={!state.canDeliver()} onClick={() => state.deliver()}>{t('nimi.mobileContinue')}</Button><Button variant="outline" onClick={() => state.discard()}>{t('common.cancel')}</Button></div></section>}
    {saved && <p className="notebook-mobile-notice" role="status">{saved.kind === 'error' ? saved.error : saved.kind === 'saving' ? t('nimi.mobileSaving', { name: saved.name }) : saved.kind === 'saved' ? t('nimi.mobileSaved', { name: saved.name }) : t('nimi.mobileCanceled')}</p>}
    <NimiAppAccessGate externalAccountControl title={t('common.appName')} language={language.startsWith('zh') ? 'zh' : 'en'}>{scope => <Workspace key={scope.viewKey} scope={scope} state={state} save={save} />}</NimiAppAccessGate>
  </>
}
function App() {
  const { t, language } = useTranslation()
  const { snapshot } = useNimiAppSession()
  const identity = snapshot.identity.status === 'signed-in' ? snapshot.identity : null
  return <div className="notebook-mobile-shell"><header><strong>{t('common.appName')}</strong>{identity && <Popover><PopoverTrigger asChild><Button variant="outline" size="sm">{identity.user?.displayName || t('nimi.title')}</Button></PopoverTrigger><PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]"><NimiAccountControl language={language.startsWith('zh') ? 'zh' : 'en'} /></PopoverContent></Popover>}</header>
    <NimiAppAccessGate externalAccountControl requireRuntime={false} title={t('common.appName')} language={language.startsWith('zh') ? 'zh' : 'en'}>{identity && <IdentityWorkspace key={identity.viewKey} identity={identity} />}</NimiAppAccessGate>
  </div>
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><I18nProvider><NimiAppSessionProvider session={session}><App /></NimiAppSessionProvider></I18nProvider></ThemeProvider></ErrorBoundary>)
void session.start()
