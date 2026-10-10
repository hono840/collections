import { describe, expect, it } from 'vitest'
import {
  GSI_ATTRIBUTION,
  GSI_MAX_ZOOM,
  GSI_MIN_ZOOM,
  GSI_STD_TILE_URL,
  JAPAN_CENTER,
  JAPAN_DEFAULT_ZOOM,
} from './gsi-tiles'

// Architecture 9.1 / design spec 6-1, 6-2. Tiles: 地理院タイル (GSI).
// NOTE: architecture 9.1 says the standard map (std); design spec 6-1 says the pale map.
// Both are official GSI tile sets, so either path is accepted here; the CTO decides.
describe('GSI tiles', () => {
  it('uses an official GSI XYZ tile URL template on cyberjapandata.gsi.go.jp (https)', () => {
    expect(GSI_STD_TILE_URL).toMatch(
      /^https:\/\/cyberjapandata\.gsi\.go\.jp\/xyz\/(std|pale)\/\{z\}\/\{x\}\/\{y\}\.png$/,
    )
  })

  it('zoom range is 5..18 (national coverage)', () => {
    expect(GSI_MIN_ZOOM).toBe(5)
    expect(GSI_MAX_ZOOM).toBe(18)
  })

  it('default view covers all of Japan', () => {
    expect(JAPAN_CENTER).toHaveLength(2)
    const [lat, lng] = JAPAN_CENTER
    expect(lat).toBeGreaterThanOrEqual(20)
    expect(lat).toBeLessThanOrEqual(46)
    expect(lng).toBeGreaterThanOrEqual(122)
    expect(lng).toBeLessThanOrEqual(154)
    expect(JAPAN_DEFAULT_ZOOM).toBeGreaterThanOrEqual(GSI_MIN_ZOOM)
    expect(JAPAN_DEFAULT_ZOOM).toBeLessThanOrEqual(7)
  })

  describe('attribution (required by GSI terms)', () => {
    function parseAttribution() {
      const container = document.createElement('div')
      container.innerHTML = GSI_ATTRIBUTION
      return container
    }

    it('links to the GSI tile list page', () => {
      const link = parseAttribution().querySelector('a')
      expect(link).not.toBeNull()
      expect(link?.getAttribute('href')).toBe('https://maps.gsi.go.jp/development/ichiran.html')
    })

    it('names the source as 国土地理院 or 地理院タイル', () => {
      expect(parseAttribution().textContent).toMatch(/国土地理院|地理院タイル/)
    })

    it('opens in a new tab safely (noopener noreferrer)', () => {
      const link = parseAttribution().querySelector('a')
      expect(link?.getAttribute('target')).toBe('_blank')
      expect(link?.getAttribute('rel')).toEqual(expect.stringContaining('noopener'))
      expect(link?.getAttribute('rel')).toEqual(expect.stringContaining('noreferrer'))
    })

    it('contains no script or event handler', () => {
      const container = parseAttribution()
      expect(container.querySelector('script')).toBeNull()
      expect(GSI_ATTRIBUTION).not.toMatch(/\son\w+=/i)
    })
  })
})
