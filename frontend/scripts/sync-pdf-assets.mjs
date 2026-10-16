import { cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pdfjs = dirname(require.resolve('pdfjs-dist/package.json'))
mkdirSync(resolve(root, 'public/pdfjs'), { recursive: true })
cpSync(resolve(pdfjs, 'build/pdf.worker.min.mjs'), resolve(root, 'public/pdf.worker.min.mjs'))
for (const dir of ['cmaps', 'standard_fonts']) {
  cpSync(resolve(pdfjs, dir), resolve(root, 'public/pdfjs', dir), { recursive: true })
}
console.log('[sync-pdf-assets] Copied worker, character maps and fonts from resolved pdfjs-dist')
