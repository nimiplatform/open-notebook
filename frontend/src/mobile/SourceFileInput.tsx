import { useEffect, useRef, type ChangeEvent, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { mobileServices } from './bridge'
// A DataTransfer accepts a foreign File but preserves its JavaScript realm.
// The original form/API checks File in this document, so rewrap the same Blob
// bytes and metadata here rather than widening those business input checks.
export function fileInSourceDocument(file: File) {
  return new File([file], file.name, { type: file.type, lastModified: file.lastModified })
}
export function sourceFileList(files: File[]) {
  const transfer = new DataTransfer()
  files.forEach(file => transfer.items.add(fileInSourceDocument(file)))
  return transfer.files
}
export function SourceFileInput({ draftKey, ref, ...props }: ComponentProps<typeof Input> & { draftKey: string }) {
  const element = useRef<HTMLInputElement>(null)
  const handler = useRef(props.onChange)
  useEffect(() => { handler.current = props.onChange }, [props.onChange])
  useEffect(() => {
    const services = mobileServices()
    if (!services) return
    services.input(draftKey, files => {
      if (!element.current?.isConnected) throw new Error('NOTEBOOK_SOURCE_FORM_CLOSED')
      element.current.files = sourceFileList(files)
      handler.current?.({ target: element.current, currentTarget: element.current, type: 'change' } as ChangeEvent<HTMLInputElement>)
    })
    return () => { try { services.input(draftKey) } catch { /* The old scope is already fenced. */ } }
  }, [draftKey])
  return <Input {...props} ref={node => {
    element.current = node
    if (typeof ref === 'function') ref(node); else if (ref) ref.current = node
  }} onClick={event => {
    props.onClick?.(event)
    const services = mobileServices()
    if (services && !event.defaultPrevented) { event.preventDefault(); services.choose({ key: draftKey, accept: props.accept || '', multiple: !!props.multiple }) }
  }} />
}
