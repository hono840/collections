// 地理院タイル (GSI tiles). Verified against https://maps.gsi.go.jp/development/ichiran.html :
// - 淡色地図 (pale): https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png, ZL 5-18
// - Real-time display on a website/app needs attribution only (no application).
// - ZL 5-8 (Japan and surroundings) additionally requires the VMAP0 shoreline credit.
// The export name stays GSI_STD_TILE_URL while the value is the pale map (architecture ch.19-3).
export const GSI_STD_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'

export const GSI_TILE_LIST_URL = 'https://maps.gsi.go.jp/development/ichiran.html'

// Static HTML passed to Leaflet's attribution option (rendered as innerHTML). No user input here.
export const GSI_ATTRIBUTION =
  `<a href="${GSI_TILE_LIST_URL}" target="_blank" rel="noopener noreferrer">地理院タイル</a>` +
  ' | Shoreline data is derived from: United States. National Imagery and Mapping Agency. "Vector Map Level 0 (VMAP0)."'

export const GSI_MIN_ZOOM = 5
export const GSI_MAX_ZOOM = 18

/** Default view that shows all of Japan (used when there are no pins). */
export const JAPAN_CENTER: [number, number] = [36.2, 138.25]
export const JAPAN_DEFAULT_ZOOM = 5
