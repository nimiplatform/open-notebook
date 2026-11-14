export type SourceDraft = { open: boolean; step: number; values: Record<string, unknown>; notebooks: string[]; transformations: string[]; files?: File[] }
export type FileIntent = { key: string; accept: string; multiple: boolean }
type Binding = { target: string; view: string; signal: AbortSignal }
export class NotebookMobileState {
  private binding?: Binding
  private inputs = new Map<string, (files: File[]) => void>()
  private drafts = new Map<string, Map<string, SourceDraft>>()
  private routes = new Map<string, string>()
  private choosing?: FileIntent & { target: string }
  selection?: FileIntent & { target: string; files: File[] }
  private listeners = new Set<() => void>()
  private revision = 0
  constructor(private identity: AbortSignal, private open: (intent: FileIntent) => void) {
    identity.addEventListener('abort', () => { this.binding = undefined; this.inputs.clear(); this.drafts.clear(); this.routes.clear(); this.selection = undefined; this.choosing = undefined; this.notify() }, { once: true })
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getRevision = () => this.revision
  private notify() { this.revision++; this.listeners.forEach(listener => listener()) }
  private live(view: string) { return !this.identity.aborted && this.binding?.view === view && !this.binding.signal.aborted }
  bind(binding: Binding) {
    this.identity.throwIfAborted(); binding.signal.throwIfAborted(); this.binding = binding; this.inputs.clear()
    binding.signal.addEventListener('abort', () => { if (this.binding !== binding) return; this.inputs.clear(); this.notify() }, { once: true })
    return { route: this.routes.get(binding.target) || '/notebooks', drafts: Object.fromEntries(this.drafts.get(binding.target) || []) }
  }
  navigate(path: string, view: string) { if (this.live(view)) this.routes.set(this.binding!.target, path) }
  draft(key: string, value: SourceDraft, view: string) {
    if (!this.live(view)) return
    let entries = this.drafts.get(this.binding!.target)
    if (!entries) { entries = new Map(); this.drafts.set(this.binding!.target, entries) }
    entries.set(key, value)
  }
  input(key: string, callback: ((files: File[]) => void) | undefined, view: string) {
    if (!this.live(view)) return
    if (callback) this.inputs.set(key, callback); else this.inputs.delete(key)
    this.notify()
  }
  choose(intent: FileIntent, view: string) {
    if (!this.live(view)) throw new Error('NOTEBOOK_SESSION_ENDED')
    this.choosing = { ...intent, target: this.binding!.target }; this.open(intent)
  }
  selected(files: File[]) {
    if (this.identity.aborted || !this.choosing) return
    if (files.length) this.selection = { ...this.choosing, files }
    this.choosing = undefined; this.notify()
  }
  discard() { this.selection = undefined; this.choosing = undefined; this.notify() }
  canDeliver() { return !!this.selection && !!this.binding && this.live(this.binding.view) && this.selection.target === this.binding.target && this.inputs.has(this.selection.key) }
  deliver() {
    if (!this.canDeliver()) return
    const selection = this.selection!
    // Delivery only fills the original form. No upload or workflow starts here.
    this.inputs.get(selection.key)!(selection.files)
    this.selection = undefined; this.notify()
  }
}
