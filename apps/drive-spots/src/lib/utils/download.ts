// Saves text as a file from the page itself (spec AC32). Nothing goes over the network: the Blob URL
// points at memory in this tab. Call it from a click handler in a 'use client' component.

// Safari on iPhone may ask before saving a download; revoking the URL before the user answers would
// make the download fail, so the URL is kept for a while (40 s, the delay FileSaver.js uses).
const REVOKE_OBJECT_URL_DELAY_MS = 40_000

/** Downloads `content` as `fileName`: Blob -> object URL -> press an <a download> -> revoke later. */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const objectUrl = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  // In the document while it is pressed (some older browsers ignore clicks on detached links), then removed.
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_OBJECT_URL_DELAY_MS)
}
