/**
 * Centralized API base URL.
 *
 * - In development (local): uses http://localhost:3000 (via VITE_API_URL not set)
 * - In production (Render): uses the value of VITE_API_URL injected at build time
 *
 * Set VITE_API_URL in your Vercel environment variables to point to your Render API URL.
 * Example: VITE_API_URL=https://smik-api.onrender.com
 */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * WebSocket base URL — automatically converts http(s) to ws(s).
 * Example: https://smik-api.onrender.com → wss://smik-api.onrender.com
 */
export const WS_URL = API_URL.replace(/^http/, 'ws')
