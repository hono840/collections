'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils/cn'

/** イベント購読不要（一度判定すれば変わらない）ため no-op の subscribe を共有 */
const noopSubscribe = () => () => {}
/** Web Share API が使えるか。client では navigator.share の有無、server/初回水和は false 側に倒す */
const getCanNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export interface ShareButtonProps {
  /** 共有するテキスト本文 */
  text: string
  /** 共有タイトル（Web Share API の title） */
  title?: string
  /** 共有 URL（任意。Web Share API の url / コピー本文に付与） */
  url?: string
  /** ボタンのラベル */
  label?: string
  /** フル幅表示 */
  fullWidth?: boolean
  className?: string
}

type ShareState = 'idle' | 'copied'

/**
 * 共有ボタン。`navigator.share`（Web Share API）が使えればネイティブ共有シート、
 * 使えない環境ではクリップボードへコピーするフォールバックを行う。
 * コピー成功時は一時的に「コピーしました」表示に切り替える。Client Component。
 */
export function ShareButton({
  text,
  title,
  url,
  label = 'シェア',
  fullWidth = false,
  className,
}: ShareButtonProps) {
  const [state, setState] = useState<ShareState>('idle')
  // Web Share API の有無で表示アイコンを切り替える。SSR・初回水和は false（getServerSnapshot）に倒し、
  // 水和後に client 判定へ切り替える。effect での setState を使わないため hydration 安全かつ警告も出ない。
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    getCanNativeShare,
    () => false,
  )

  const handleShare = useCallback(async () => {
    const shareText = url ? `${text}\n${url}` : text

    // 1. Web Share API（モバイル中心）
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text,
          ...(url ? { url } : {}),
        })
        return
      } catch {
        // ユーザーキャンセル or 失敗 → フォールバックへ
      }
    }

    // 2. クリップボードフォールバック
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(shareText)
        setState('copied')
        window.setTimeout(() => setState('idle'), 2000)
      } catch {
        // クリップボードも失敗した場合は何もしない（致命的でない）
      }
    }
  }, [text, title, url])

  const copied = state === 'copied'

  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth={fullWidth}
      onClick={handleShare}
      aria-live="polite"
      className={cn(className)}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" aria-hidden />
          コピーしました
        </>
      ) : (
        <>
          {canNativeShare ? (
            <Share2 className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {label}
        </>
      )}
    </Button>
  )
}
