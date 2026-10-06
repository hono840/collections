function isProtocolRelativeLike(path: string): boolean {
  return !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')
}

/**
 * Returns a same-origin path (pathname + search) that is safe to redirect to,
 * or `fallback` when the value could send the user to another origin
 * (open-redirect protection). Hash fragments are dropped.
 *
 * Both the raw input AND the URL-normalized pathname are checked: dot segments
 * such as "/.//evil.example.com" normalize to "//evil.example.com", which a
 * browser would treat as a protocol-relative URL to another host.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/roads'): string {
  if (!raw || isProtocolRelativeLike(raw)) return fallback
  try {
    const base = 'http://internal.invalid'
    const url = new URL(raw, base)
    if (url.origin !== base) return fallback
    if (isProtocolRelativeLike(url.pathname)) return fallback
    return `${url.pathname}${url.search}`
  } catch {
    return fallback
  }
}
