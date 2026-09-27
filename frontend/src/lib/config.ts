import { notebookBackend } from '@/lib/nimi/client'
/**
 * Runtime configuration for the frontend.
 * This allows the same Docker image to work in different environments.
 */

import { AppConfig, BackendConfigResponse } from '@/lib/types/config'

// Build timestamp for debugging - set at build time
const BUILD_TIME = new Date().toISOString()

let config: AppConfig | null = null
let configPromise: Promise<AppConfig> | null = null

/**
 * Get the API URL to use for requests.
 *
 * Priority:
 * 1. Runtime config from API server (/api/config endpoint)
 * 2. Environment variable (NEXT_PUBLIC_API_URL)
 * 3. Default fallback (http://localhost:5055)
 */
export async function getApiUrl(): Promise<string> {
  // If we already have config, return it
  if (config) {
    return config.apiUrl
  }

  // If we're already fetching, wait for that
  if (configPromise) {
    const cfg = await configPromise
    return cfg.apiUrl
  }

  // Start fetching config
  configPromise = fetchConfig()
  const cfg = await configPromise
  return cfg.apiUrl
}

/**
 * Get the full configuration.
 */
export async function getConfig(): Promise<AppConfig> {
  if (config) {
    return config
  }

  if (configPromise) {
    return await configPromise
  }

  configPromise = fetchConfig()
  return await configPromise
}

/**
 * Fetch configuration from the API or use defaults.
 */
async function fetchConfig(): Promise<AppConfig> {
  const isDev = process.env.NODE_ENV === 'development'
  const baseUrl = notebookBackend()
  try {
    if (isDev) console.log('🔧 [Config] Fetching backend config from:', `${baseUrl}/api/config`)
    // Try to fetch runtime config from backend API
    const response = await fetch(`${baseUrl}/api/config`, {
      cache: 'no-store',
    })

    if (response.ok) {
      const data: BackendConfigResponse = await response.json()
      config = {
        apiUrl: baseUrl, // Use baseUrl from runtime-config (Python no longer returns this)
        version: data.version || 'unknown',
        buildTime: BUILD_TIME,
        latestVersion: data.latestVersion || null,
        hasUpdate: data.hasUpdate || false,
        dbStatus: data.dbStatus, // Can be undefined for old backends
      }
      if (isDev) console.log('✅ [Config] Successfully loaded API config:', config)
      return config
    } else {
      // Don't log error here - ConnectionGuard will display it
      throw new Error(`API config endpoint returned status ${response.status}`)
    }
  } catch (error) {
    // Don't log error here - ConnectionGuard will display it with proper UI
    throw error
  }
}

/**
 * Reset the configuration cache (useful for testing).
 */
export function resetConfig(): void {
  config = null
  configPromise = null
}
