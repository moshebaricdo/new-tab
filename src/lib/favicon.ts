/** Best-effort favicon URL for a link (Google's S2 service). */
export function faviconForUrl(url: string, size = 32): string | null {
  try {
    const { hostname } = new URL(url)
    if (!hostname) return null
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`
  } catch {
    return null
  }
}
