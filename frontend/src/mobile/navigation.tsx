import { createContext, useContext, useMemo, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react'

export function mobilePath(value: string) {
  const url = new URL(value, 'https://notebook.invalid')
  if (url.origin !== 'https://notebook.invalid' || !url.pathname.startsWith('/')) throw new Error('NOTEBOOK_INVALID_ROUTE')
  return url.pathname + url.search
}
const readPath = () => mobilePath(location.hash.slice(1) || '/notebooks')
const subscribe = (callback: () => void) => { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback) }
const router = {
  push(path: string) { location.hash = mobilePath(path) },
  replace(path: string) { history.replaceState(null, '', '#' + mobilePath(path)); window.dispatchEvent(new Event('hashchange')) },
  back() { history.back() },
}
const Parameters = createContext<Record<string, string>>({})
export function RouteParameters({ values, children }: { values: Record<string, string>; children: ReactNode }) { return <Parameters.Provider value={values}>{children}</Parameters.Provider> }
export const useRouter = () => router
export const useRoute = () => useSyncExternalStore(subscribe, readPath, () => '/notebooks')
export function usePathname() { return useRoute().split('?')[0] }
export function useSearchParams() { const path = useRoute(); return useMemo(() => new URLSearchParams(path.split('?')[1] || ''), [path]) }
export function useParams<T extends Record<string, string>>() { return useContext(Parameters) as T }
export function Link({ href, onClick, children, ...props }: Omit<ComponentProps<'a'>, 'href'> & { href: string }) {
  return <a {...props} href={'#' + mobilePath(href)} onClick={event => {
    onClick?.(event)
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (!props.target || props.target === '_self')) {
      event.preventDefault(); router.push(href)
    }
  }}>{children}</a>
}
