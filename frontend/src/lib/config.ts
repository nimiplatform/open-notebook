import { notebookBackend } from '@/lib/nimi/client'
import type { AppConfig, BackendConfigResponse } from '@/lib/types/config'

const BUILD_TIME = new Date().toISOString()

let configRequest: { apiUrl: string; promise: Promise<AppConfig> } | null = null

/** Read the current Host-selected endpoint, including after a backend restart. */
export async function getApiUrl(): Promise<string> {
  return notebookBackend()
}

/** Cache version and health information only for the selected backend. */
export async function getConfig(): Promise<AppConfig> {
  const apiUrl = notebookBackend()
  if (!configRequest || configRequest.apiUrl !== apiUrl) {
    const request = { apiUrl, promise: fetchConfig(apiUrl) }
    configRequest = request
    // A failed request can be tried again explicitly. A late failure from a
    // previous backend must not clear the current backend's request.
    void request.promise.catch(() => {
      if (configRequest === request) configRequest = null
    })
  }
  return configRequest.promise
}

async function fetchConfig(apiUrl: string): Promise<AppConfig> {
  const response = await fetch(`${apiUrl}/api/config`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`API config endpoint returned status ${response.status}`)
  }

  const data: BackendConfigResponse = await response.json()
  return {
    apiUrl,
    version: data.version || 'unknown',
    buildTime: BUILD_TIME,
    latestVersion: data.latestVersion || null,
    hasUpdate: data.hasUpdate || false,
    dbStatus: data.dbStatus,
  }
}

/** Explicitly reload health information on the next configuration request. */
export function resetConfig(): void {
  configRequest = null
}
