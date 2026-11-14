import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { I18nProvider } from '@/components/providers/I18nProvider'
import { ConnectionGuard } from '@/components/common/ConnectionGuard'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import DashboardLayout from '@/app/(dashboard)/layout'
import { bindNotebookWebScope, connectNotebookWorkspace } from '@/lib/nimi/web-transport'
import { setNotebookBackend } from '@/lib/nimi/client'
import { bindMobileDocument, mobileServices, setMobileDrafts } from './bridge'
import { RouteParameters, useRoute, useRouter, mobilePath } from './navigation'
import './mobile.css'
// Use the original client pages. New server imports fail the mobile build.
const pages = Object.entries(import.meta.glob('../app/(dashboard)/**/page.tsx') as Record<string, () => Promise<{ default: ComponentType }>>)
  .filter(([key]) => !key.endsWith('(dashboard)/page.tsx'))
  .map(([key, load]) => {
    const path = key.slice('../app/(dashboard)'.length, -'/page.tsx'.length)
    const names = Array.from(path.matchAll(/\[([^\]]+)\]/g), match => match[1])
    return { expression: new RegExp('^' + path.replace(/\[[^\]]+\]/g, '([^/]+)') + '/?$'), names, Page: lazy(load) }
  })
function Routes() {
  const path = useRoute(), router = useRouter(), { t } = useTranslation()
  useEffect(() => { mobileServices()?.navigate(path) }, [path])
  const selected = pages.find(page => page.expression.test(path.split('?')[0]))
  if (!selected) return <main className="p-6"><p>{t('common.error')}</p><Button onClick={() => router.replace('/notebooks')}>{t('navigation.notebooks')}</Button></main>
  const match = selected.expression.exec(path.split('?')[0])!
  const params = Object.fromEntries(selected.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]))
  return <RouteParameters values={params}><Suspense fallback={<p className="p-6" role="status">{t('common.loading')}</p>}><selected.Page /></Suspense></RouteParameters>
}
function Workspace() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    void connectNotebookWorkspace().then(target => {
      if (!live) return
      const initial = mobileServices()!.ready(target)
      setMobileDrafts(initial.drafts); history.replaceState(null, '', '#' + mobilePath(initial.route))
      setNotebookBackend(location.origin); setReady(true)
    }).catch(cause => { if (live) setError(String(cause.message || cause)) })
    return () => { live = false }
  }, [attempt])
  if (!ready) return <main className="p-6 space-y-4"><h1>{t('nimi.webWorkspace')}</h1><p role={error === 'NOTEBOOK_PERMISSION_REQUIRED' ? 'alert' : undefined}>{t('nimi.mobileConnect')}</p>{error && error !== 'NOTEBOOK_PERMISSION_REQUIRED' && <p role="alert">{error === 'NOTEBOOK_PC_APP_UNAVAILABLE' ? t('nimi.webUnavailable') : error}</p>}<Button onClick={() => { setError(''); setAttempt(value => value + 1) }}>{t('common.retry')}</Button></main>
  return <ConnectionGuard><DashboardLayout><Routes /></DashboardLayout><Toaster /></ConnectionGuard>
}
let attached = false
window.acceptNotebookScope = (scope, services) => {
  if (attached) throw new Error('NOTEBOOK_DOCUMENT_SCOPE_CHANGED')
  attached = true; bindNotebookWebScope(scope); bindMobileDocument(services, scope)
  createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><QueryProvider><I18nProvider><Workspace /></I18nProvider></QueryProvider></ThemeProvider></ErrorBoundary>)
}
parent.postMessage('notebook-mobile-ready', location.origin)
