import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Shapes the HTML the way `next build` (output: 'export') writes it: <meta charSet> first in
// <head>, external chunks with src, and inline RSC payload scripts (self.__next_f.push) in <body>.
export const RSC_BOOTSTRAP = '(self.__next_f=self.__next_f||[]).push([0])'
export const RSC_CHUNK = 'self.__next_f.push([1,"0:{\\"P\\":null}\\n"])'

export function nextLikeHtml({ title = 'page', inlineScripts = [RSC_BOOTSTRAP, RSC_CHUNK] } = {}): string {
  return [
    '<!DOCTYPE html><html lang="ja"><head><meta charSet="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    '<link rel="stylesheet" href="/_next/static/css/app.css" data-precedence="next"/>',
    '<script src="/_next/static/chunks/main.js" async=""></script>',
    `<title>${title}</title></head><body><main>${title}</main>`,
    ...inlineScripts.map((body) => `<script>${body}</script>`),
    '</body></html>',
  ].join('')
}

/** Creates a throwaway out/ directory with the given files (relative path -> contents). */
export async function makeOutputDirectory(files: Record<string, string>): Promise<string> {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), 'road-review-out-'))
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(rootDirectory, relativePath)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, contents)
  }
  return rootDirectory
}
