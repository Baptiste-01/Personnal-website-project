/**
 * Dynamic resolution of API and WebSocket URLs
 *
 * Supports:
 * 1. Build-time environment variables: VITE_API_URL & VITE_WS_URL
 * 2. Runtime override via query param (?api=https://...) or localStorage ('smik_api_url')
 * 3. Vercel deployment detection (*.vercel.app) -> Defaults cleanly to Render cloud backend
 * 4. Vite Local Dev (port 5173) -> Routed through Vite reverse-proxy to avoid CORS
 * 5. Direct LAN access fallback (hostname:3000)
 */

export const DEFAULT_PRODUCTION_API = 'https://smik-party-api.onrender.com'
export const DEFAULT_PRODUCTION_WS = 'wss://smik-party-api.onrender.com'

const getHost = () => {
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname || 'localhost'
}

const getHttpProtocol = () => {
  if (typeof window === 'undefined') return 'http:'
  return window.location.protocol === 'https:' ? 'https:' : 'http:'
}

const getWsProtocol = () => {
  if (typeof window === 'undefined') return 'ws:'
  return window.location.protocol === 'https:' ? 'wss:' : 'ws:'
}

/** Check if current hostname is on Vercel */
export const isVercelHost = (): boolean => {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host.endsWith('.vercel.app')
}

/** Check runtime override (?api=... query param or stored in localStorage) */
const getRuntimeApiOverride = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const queryApi = params.get('api')
    if (queryApi) {
      const clean = queryApi.replace(/\/+$/, '')
      localStorage.setItem('smik_api_url', clean)
      return clean
    }
    const saved = localStorage.getItem('smik_api_url')
    if (saved) return saved.replace(/\/+$/, '')
  } catch {}
  return null
}

const isLocalViteDev = () => {
  if (typeof window === 'undefined') return false
  return window.location.port === '5173'
}

function resolveApiUrl(): string {
  // 1. Explicit environment variable set at build time
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  }

  // 2. Runtime override (URL query param ?api=... or localStorage)
  const runtime = getRuntimeApiOverride()
  if (runtime) return runtime

  // 3. Vercel deployment without explicit VITE_API_URL -> Target Render cloud API
  if (isVercelHost()) {
    return DEFAULT_PRODUCTION_API
  }

  // 4. Vite local dev server (port 5173) -> Use Vite proxy on current origin
  if (isLocalViteDev()) {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  }

  // 5. Cloudflare Tunnel or custom domain with port 80/443 (only if not a static host)
  if (typeof window !== 'undefined' && (!window.location.port || window.location.port === '80' || window.location.port === '443')) {
    return window.location.origin
  }

  // 6. Direct LAN or localhost fallback (port 3000)
  return `${getHttpProtocol()}//${getHost()}:3000`
}

function resolveWsUrl(resolvedApiUrl: string): string {
  // 1. Explicit environment variable set at build time
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/+$/, '')
  }

  // 2. Runtime WS override in localStorage
  if (typeof window !== 'undefined') {
    try {
      const savedWs = localStorage.getItem('smik_ws_url')
      if (savedWs) return savedWs.replace(/\/+$/, '')
    } catch {}
  }

  // 3. If API URL is remote HTTPS / HTTP, derive matching WSS / WS URL
  if (resolvedApiUrl.startsWith('https://')) {
    return resolvedApiUrl.replace(/^https:\/\//, 'wss://')
  }
  if (resolvedApiUrl.startsWith('http://') && !resolvedApiUrl.includes('localhost:5173')) {
    return resolvedApiUrl.replace(/^http:\/\//, 'ws://')
  }

  // 4. Vercel fallback
  if (isVercelHost()) {
    return DEFAULT_PRODUCTION_WS
  }

  // 5. Vite local dev server
  if (isLocalViteDev()) {
    return typeof window !== 'undefined' ? `${getWsProtocol()}//${window.location.host}` : 'ws://localhost:3000'
  }

  // 6. Direct LAN fallback
  return `${getWsProtocol()}//${getHost()}:3000`
}

// Global resolved URLs
export const API_URL: string = resolveApiUrl()
export const WS_URL: string = resolveWsUrl(API_URL)

/** Utility to switch custom backend dynamically from client UI */
export function setCustomApiUrl(url: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (!url) {
      localStorage.removeItem('smik_api_url')
      localStorage.removeItem('smik_ws_url')
    } else {
      const clean = url.replace(/\/+$/, '')
      localStorage.setItem('smik_api_url', clean)
      if (clean.startsWith('https://')) {
        localStorage.setItem('smik_ws_url', clean.replace(/^https:\/\//, 'wss://'))
      } else if (clean.startsWith('http://')) {
        localStorage.setItem('smik_ws_url', clean.replace(/^http:\/\//, 'ws://'))
      }
    }
    window.location.reload()
  } catch {}
}
