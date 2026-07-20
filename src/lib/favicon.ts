/** Candidate favicon URLs for a link, tried in order until one loads. */
export function faviconSourcesForUrl(url: string, size = 32): string[] {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    if (!host) return []

    const sources = [
      // Site's own icon first — best for Storybook / Vercel / internal hosts.
      `${parsed.origin}/favicon.ico`,
      `${parsed.origin}/favicon.png`,
      // DuckDuckGo often has icons Google's S2 misses.
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
      // Google S2 almost always returns *something* (sometimes a generic globe).
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`,
    ]

    return sources
  } catch {
    return []
  }
}

/** @deprecated Prefer faviconSourcesForUrl + onError fallbacks. */
export function faviconForUrl(url: string, size = 32): string | null {
  return faviconSourcesForUrl(url, size)[0] ?? null
}
