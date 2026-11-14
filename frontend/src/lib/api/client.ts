import axios, { AxiosResponse } from 'axios'
import { isNotebookWeb, notebookFetch } from '@/lib/nimi/web-transport'
import { AxiosError } from 'axios'
import { getApiUrl } from '@/lib/config'

// API client with runtime-configurable base URL
// The base URL is fetched from the API config endpoint on first request
//
// Request timeout defaults to 10 minutes (600000ms) to accommodate slow LLM
// operations (transformations, insights, synchronous chat) on slower hardware
// (Ollama, LM Studio). Configure it via NEXT_PUBLIC_API_TIMEOUT_MS for models
// that can take longer than 10 minutes to respond (#880).
// Note: value is in milliseconds; an explicit 0 disables the timeout entirely.
// An empty or invalid value falls back to the default (so a present-but-empty
// env var doesn't accidentally disable timeouts).
const DEFAULT_API_TIMEOUT_MS = 600000 // 600 seconds = 10 minutes
const rawTimeout = process.env.NEXT_PUBLIC_API_TIMEOUT_MS
const parsedTimeout = rawTimeout && rawTimeout.trim() !== '' ? Number(rawTimeout) : NaN
const apiTimeout = Number.isFinite(parsedTimeout) && parsedTimeout >= 0
  ? parsedTimeout
  : DEFAULT_API_TIMEOUT_MS

// Resolved request budget in milliseconds (0 = disabled). Exported so streaming
// consumers can align their own idle watchdogs to the same configurable budget.
export const API_TIMEOUT_MS = apiTimeout

export const apiClient = axios.create({
  timeout: apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  ...(isNotebookWeb ? { adapter: async (config) => {
    const url = new URL(config.url!, config.baseURL!.endsWith('/') ? config.baseURL! : config.baseURL! + '/')
    // Axios relative URLs begin with / but belong below the Notebook /api base.
    if (!/^https?:/.test(config.url!)) url.pathname = new URL(config.baseURL!).pathname.replace(/\/$/, '') + '/' + config.url!.replace(/^\//, '')
    for (const [key, value] of Object.entries(config.params || {})) if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    const signals: AbortSignal[] = []
    if (config.signal) signals.push(config.signal as AbortSignal)
    if (config.timeout) signals.push(AbortSignal.timeout(config.timeout))
    const response = await notebookFetch(url.href, { method: config.method?.toUpperCase(), body: config.data, signal: signals.length ? AbortSignal.any(signals) : undefined })
    const data = config.responseType === 'blob' ? await response.blob() : await response.text()
    const result = { data, status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers), config }
    if (!response.ok) throw new AxiosError(`Notebook request failed (${response.status})`, 'ERR_BAD_RESPONSE', config, undefined, { ...result, data: typeof data === 'string' ? (() => { try { return JSON.parse(data) } catch { return data } })() : data })
    return result
  } } : {}),
})

// Request interceptor to add base URL and auth header
apiClient.interceptors.request.use(async (config) => {
  // Set the base URL dynamically from runtime config
  if (!config.baseURL) {
    const apiUrl = await getApiUrl()
    config.baseURL = `${apiUrl}/api`
  }

  // Handle FormData vs JSON content types
  if (config.data instanceof FormData) {
    // Remove any Content-Type header to let browser set multipart boundary
    delete config.headers['Content-Type']
  } else if (config.method && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
    config.headers['Content-Type'] = 'application/json'
  }

  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient