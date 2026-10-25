import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from './download'

// downloadTextFile (spec AC32, docs/product/architecture.md): Blob -> URL.createObjectURL ->
// press an <a download> -> URL.revokeObjectURL afterwards. Nothing goes over the network.
// jsdom cannot create or open Blob URLs, so both URL statics are mocked, and the anchor's click is
// replaced with a recorder (jsdom would otherwise try to navigate to the blob: URL).

const OBJECT_URL = 'blob:http://localhost/drive-spots-test'
const FILE_NAME = 'drive-spots-2026-10-25.json'
const CONTENT = '{\n  "app": "drive-spots",\n  "memo": "峠のホームコースにしたい"\n}'
const MIME_TYPE = 'application/json'

type ClickedAnchor = { href: string | null; download: string }

let clickedAnchors: ClickedAnchor[]

/** jsdom may not define the Blob URL statics at all; give vi.spyOn something to replace. */
function ensureObjectUrlStatics() {
  const urlStatics = URL as unknown as Record<string, unknown>
  if (typeof urlStatics.createObjectURL !== 'function') urlStatics.createObjectURL = () => ''
  if (typeof urlStatics.revokeObjectURL !== 'function') urlStatics.revokeObjectURL = () => undefined
}

function mockDownloadApis() {
  ensureObjectUrlStatics()
  const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(OBJECT_URL)
  const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function recordClick(
    this: HTMLAnchorElement,
  ) {
    clickedAnchors.push({ href: this.getAttribute('href'), download: this.download })
  })
  return { createObjectURLSpy, revokeObjectURLSpy, clickSpy }
}

/** The Blob handed to URL.createObjectURL. */
function getCreatedBlob(createObjectURLSpy: ReturnType<typeof mockDownloadApis>['createObjectURLSpy']): Blob {
  expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
  const [blob] = createObjectURLSpy.mock.calls[0]
  expect(blob).toBeInstanceOf(Blob)
  return blob as Blob
}

beforeEach(() => {
  clickedAnchors = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('downloadTextFile', () => {
  it('AC32: makes one Blob URL from a Blob holding the content with the given type', async () => {
    const { createObjectURLSpy } = mockDownloadApis()

    downloadTextFile(FILE_NAME, CONTENT, MIME_TYPE)
    vi.runAllTimers()

    const blob = getCreatedBlob(createObjectURLSpy)
    expect(blob.type).toContain(MIME_TYPE)
    vi.useRealTimers()
    expect(await blob.text()).toBe(CONTENT)
  })

  it('AC32: presses one link to the Blob URL whose download name is the file name', () => {
    const { clickSpy } = mockDownloadApis()

    downloadTextFile(FILE_NAME, CONTENT, MIME_TYPE)
    vi.runAllTimers()

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(clickedAnchors).toEqual([{ href: OBJECT_URL, download: FILE_NAME }])
  })

  it('AC32: revokes the Blob URL once, after the link was pressed', () => {
    const { clickSpy, revokeObjectURLSpy } = mockDownloadApis()

    downloadTextFile(FILE_NAME, CONTENT, MIME_TYPE)
    vi.runAllTimers()

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(OBJECT_URL)
    expect(revokeObjectURLSpy.mock.invocationCallOrder[0]).toBeGreaterThan(clickSpy.mock.invocationCallOrder[0])
  })

  it('AC32: does not leave the link in the page', () => {
    mockDownloadApis()

    downloadTextFile(FILE_NAME, CONTENT, MIME_TYPE)
    vi.runAllTimers()

    expect(document.querySelectorAll('a').length).toBe(0)
  })

  it('AC32/AC21: does not use the network or open a window', () => {
    mockDownloadApis()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    downloadTextFile(FILE_NAME, CONTENT, MIME_TYPE)
    vi.runAllTimers()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('AC32: each call downloads its own file', () => {
    const { createObjectURLSpy, revokeObjectURLSpy } = mockDownloadApis()

    downloadTextFile('drive-spots-2026-10-24.json', CONTENT, MIME_TYPE)
    downloadTextFile(FILE_NAME, CONTENT, MIME_TYPE)
    vi.runAllTimers()

    expect(createObjectURLSpy).toHaveBeenCalledTimes(2)
    expect(clickedAnchors.map((anchor) => anchor.download)).toEqual(['drive-spots-2026-10-24.json', FILE_NAME])
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2)
  })
})
