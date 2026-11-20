import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { I18nProvider } from '@/components/providers/I18nProvider'
import { NimiWebBoundary } from '@/components/nimi/NimiWebBoundary'
import { ConnectionGuard } from '@/components/common/ConnectionGuard'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import DashboardLayout from '@/app/(dashboard)/layout'
import { RouteParameters, useRoute, useRouter, webPath } from './navigation'
import './web.css'

const RETURN_HASH_KEY = 'notebook-web-return-hash'

function applyInitialTheme() {
  try {
    const stored = JSON.parse(localStorage.getItem('theme-storage') || '{}') as { state?: { theme?: string } }
    const theme = stored.state?.theme || 'system'
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const effectiveTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(effectiveTheme)
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  } catch {
    document.documentElement.classList.add('light')
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

function rememberInitialDeepLink() {
  if (!location.hash || location.hash === '#' || location.hash === '#/notebooks') return
  try {
    const normalized = webPath(location.hash.slice(1))
    sessionStorage.setItem(RETURN_HASH_KEY, normalized)
  } catch {
    // Ignore malformed hashes
  }
}

const routeTable: Array<{ pattern: string; load: () => Promise<{ default: ComponentType }> }> = [
  { pattern: '/notebooks', load: () => import('@/app/(dashboard)/notebooks/page') },
  { pattern: '/notebooks/[id]', load: () => import('@/app/(dashboard)/notebooks/[id]/page') },
  { pattern: '/sources', load: () => import('@/app/(dashboard)/sources/page') },
  { pattern: '/sources/[id]', load: () => import('@/app/(dashboard)/sources/[id]/page') },
  { pattern: '/search', load: () => import('@/app/(dashboard)/search/page') },
  { pattern: '/podcasts', load: () => import('@/app/(dashboard)/podcasts/page') },
  { pattern: '/transformations', load: () => import('@/app/(dashboard)/transformations/page') },
  { pattern: '/settings', load: () => import('@/app/(dashboard)/settings/page') },
  { pattern: '/settings/models', load: () => import('@/app/(dashboard)/settings/models/page') },
  { pattern: '/advanced', load: () => import('@/app/(dashboard)/advanced/page') },
]

const pages = routeTable.map(({ pattern, load }) => {
  const names = Array.from(pattern.matchAll(/\[([^\]]+)\]/g), match => match[1])
  return {
    expression: new RegExp('^' + pattern.replace(/\[[^\]]+\]/g, '([^/]+)') + '/?$'),
    names,
    Page: lazy(load),
  }
})

function Routes() {
  const path = useRoute()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    if (!location.hash) {
      const saved = sessionStorage.getItem(RETURN_HASH_KEY)
      if (saved) {
        sessionStorage.removeItem(RETURN_HASH_KEY)
        router.replace(saved)
      }
    } else {
      sessionStorage.removeItem(RETURN_HASH_KEY)
    }
  }, [router])

  const pathname = path.split('?')[0] || '/notebooks'
  const selected = pages.find(page => page.expression.test(pathname))
  if (!selected) {
    return (
      <main className="p-6 space-y-4">
        <p>{t('common.error')}</p>
        <Button onClick={() => router.replace('/notebooks')}>{t('navigation.notebooks')}</Button>
      </main>
    )
  }
  const match = selected.expression.exec(pathname)!
  const params = Object.fromEntries(selected.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]))
  return (
    <RouteParameters values={params}>
      <Suspense fallback={<p className="p-6" role="status">{t('common.loading')}</p>}>
        <selected.Page />
      </Suspense>
    </RouteParameters>
  )
}

applyInitialTheme()
rememberInitialDeepLink()
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <QueryProvider>
        <I18nProvider>
          <NimiWebBoundary>
            <ConnectionGuard>
              <DashboardLayout>
                <Routes />
              </DashboardLayout>
              <Toaster />
            </ConnectionGuard>
          </NimiWebBoundary>
        </I18nProvider>
      </QueryProvider>
    </ThemeProvider>
  </ErrorBoundary>
)
