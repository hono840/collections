import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { BASE_PATH } from '../site-config.mjs'

// Shapes the HTML the way `next build` (output: 'export', basePath) writes it: <meta charSet> first
// in <head>, external chunks with src under BASE_PATH, and inline RSC payload scripts
// (self.__next_f.push) in <body>. The files themselves sit at the root of out/ (no basePath folder).
export const RSC_BOOTSTRAP = '(self.__next_f=self.__next_f||[]).push([0])'
export const RSC_CHUNK = 'self.__next_f.push([1,"0:{\\"P\\":null}\\n"])'

export const CSS_PATH = '_next/static/chunks/app.css'
export const SCRIPT_PATH = '_next/static/chunks/main.js'
export const FONT_PATH = '_next/static/media/font-s.p.woff2'

export function nextLikeHtml({ title = 'page', inlineScripts = [RSC_BOOTSTRAP, RSC_CHUNK] } = {}): string {
  return [
    '<!DOCTYPE html><html lang="ja"><head><meta charSet="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>',
    `<link rel="preload" href="${BASE_PATH}/${FONT_PATH}" as="font" crossorigin="" type="font/woff2"/>`,
    `<link rel="stylesheet" href="${BASE_PATH}/${CSS_PATH}" data-precedence="next"/>`,
    `<script src="${BASE_PATH}/${SCRIPT_PATH}" async=""></script>`,
    `<title>${title}</title></head><body><main>${title}</main>`,
    ...inlineScripts.map((body) => `<script>${body}</script>`),
    '</body></html>',
  ].join('')
}

/** CSS the way Next writes next/font output: relative url() from chunks/ to media/. */
export const NEXT_LIKE_CSS = `@font-face{font-family:x;src:url(../media/${path.posix.basename(FONT_PATH)}) format("woff2")}`

/** The asset files nextLikeHtml() / NEXT_LIKE_CSS reference, so a fixture out/ is complete. */
export const NEXT_LIKE_ASSETS: Record<string, string> = {
  [CSS_PATH]: NEXT_LIKE_CSS,
  [SCRIPT_PATH]: 'console.log(1)',
  [FONT_PATH]: 'wOF2',
}

/** Creates a throwaway directory with the given files (relative path -> contents). */
export async function makeOutputDirectory(files: Record<string, string>): Promise<string> {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), 'drive-spots-out-'))
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(rootDirectory, relativePath)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, contents)
  }
  return rootDirectory
}
