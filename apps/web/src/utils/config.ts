/**
 * Dynamic resolution of API and WebSocket URLs
 *
 * Supports:
 * 1. Environment variables VITE_API_URL and VITE_WS_URL (explicit override)
 * 2. Cloudflare Tunnel / Public Domains (ports 80, 443 or default empty port)
 *    -> Routed cleanly through Vite's reverse-proxy to avoid CORS and mixed content issues
 * 3. Vite Local Dev (port 5173) -> Uses Vite reverse-proxy directly
 * 4. Direct LAN access fallback (hostname:3000)
 */

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

const shouldUseReverseProxy = () => {
  if (typeof window === 'undefined') return false
  const p = window.location.port
  // Cloudflare Tunnel, Standard Web ports, or Vite dev server proxy
  return !p || p === '80' || p === '443' || p === '5173'
}

// API URL
export const API_URL: string =
  import.meta.env.VITE_API_URL ||
  (shouldUseReverseProxy()
    ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    : `${getHttpProtocol()}//${getHost()}:3000`)

// WebSocket URL
export const WS_URL: string =
  import.meta.env.VITE_WS_URL ||
  (shouldUseReverseProxy()
    ? (typeof window !== 'undefined' ? `${getWsProtocol()}//${window.location.host}` : 'ws://localhost:3000')
    : `${getWsProtocol()}//${getHost()}:3000`)
