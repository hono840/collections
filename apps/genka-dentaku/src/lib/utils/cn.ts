/**
 * Tailwind class merge utility (clsx + tailwind-merge).
 *
 * tailwind-merge does not read the Tailwind v4 `@theme`, so our custom design tokens
 * (design-spec §2) must be registered or it will misclassify them — e.g. the custom font-size
 * `text-body` collides with the text-color `text-ink` and gets dropped. We extend the default
 * config so the token utilities survive conflict resolution.
 */
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/** Custom font-size utilities from globals.css @theme (--text-*). */
const FONT_SIZES = [
  'hero',
  'metric-lg',
  'metric',
  'h1',
  'h2',
  'h3',
  'body',
  'body-sm',
  'label',
  'caption',
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Register custom font sizes so `text-body` is treated as size, not colour.
      'font-size': [{ text: FONT_SIZES }],
      // Custom monospace family (--font-num) alongside --font-sans.
      'font-family': [{ font: ['num', 'sans'] }],
      // Custom pill radius (--radius-pill).
      'rounded': [{ rounded: ['pill'] }],
      // Custom bottom-bar shadow (--shadow-bar).
      'shadow': [{ shadow: ['bar'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
