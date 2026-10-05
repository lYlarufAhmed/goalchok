/**
 * Generates a RFC4122 v4 UUID.
 * Uses crypto.randomUUID() when available in secure contexts (HTTPS / localhost).
 * Falls back to Math.random() in non-secure HTTP contexts (e.g. Tailscale / LAN IP over HTTP).
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
