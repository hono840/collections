/**
 * Tailwind クラス結合ユーティリティ（clsx + tailwind-merge）。
 * budget-app と同一実装。
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
