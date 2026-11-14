import type { NimiAppScope } from '@nimiplatform/kit/core/app-session'
import type { FileIntent, SourceDraft } from './state'
export type MobileServices = {
  ready(target: string): { route: string; drafts: Record<string, SourceDraft> }
  navigate(path: string): void
  draft(key: string, value: SourceDraft): void
  input(key: string, deliver?: (files: File[]) => void): void
  choose(intent: FileIntent): void
  save(blob: Blob, name: string): Promise<{ canceled: boolean }>
  failed(message: string): void
}
declare global { interface Window { acceptNotebookScope?: (scope: NimiAppScope, services: MobileServices) => void } }
let services: MobileServices | undefined
let signal: AbortSignal | undefined
let drafts: Record<string, SourceDraft> = {}
export const isNotebookMobile = () => !!services
export function bindMobileDocument(value: MobileServices, scope: NimiAppScope) {
  if (services) throw new Error('NOTEBOOK_DOCUMENT_SCOPE_CHANGED')
  services = value; signal = scope.signal
}
export function mobileServices() { signal?.throwIfAborted(); return services }
export function setMobileDrafts(value: Record<string, SourceDraft>) { drafts = value }
export function sourceDraft(key: string) { return drafts[key] }
export function rememberSourceDraft(key: string, value: SourceDraft) { if (signal?.aborted) return; drafts[key] = value; services?.draft(key, value) }
export async function saveNotebookFile(blob: Blob, name: string) {
  if (services) return mobileServices()!.save(blob, name)
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
  return { canceled: false }
}
