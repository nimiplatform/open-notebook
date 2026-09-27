'use client'
import { createNimiClient, type NimiLocalAppClient } from '@nimiplatform/sdk'
import { createNimiLocalAppStandardShellSurface } from '@nimiplatform/kit/shell/renderer/bridge'
let client: NimiLocalAppClient | null = null
export function getNimiClient() {
  client ??= createNimiClient({ localApp: { standardShell: createNimiLocalAppStandardShellSurface() } })
  return client
}
let backendUrl: string | null = null
export function setNotebookBackend(url: string) { backendUrl = url }
export function notebookBackend() {
  if (!backendUrl) throw new Error('Notebook workspace is not ready')
  return backendUrl
}
