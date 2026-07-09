'use client'
/**
 * LicenseApplyIsland — /pricing から直接 Pro を解錠する小さな client island（PRD 5.3 / architecture §9.1）。
 * LicenseKeyField（入力 UI）+ useCanonicalStore（端末内永続化）+ verifyLicenseKey（Ed25519 署名検証）を束ねる。
 *
 * 署名検証に通ったキーだけを localStorage に保存し、plan/exp/status は保存しない（毎起動で再検証・耐タンパー）。
 * AppStateProvider に依存しないため、Provider の無い静的 Server ページ（料金）にそのまま埋め込める。
 * localStorage は client でのみ読めるため、hydration 完了（mounted）まではスケルトンを出す。
 */
import { useState } from 'react'
import Link from 'next/link'
import { verifyLicenseKey } from '@/lib/license/verify'
import { useCanonicalStore } from '@/lib/hooks/use-canonical-store'
import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/atoms/Skeleton'
import { LicenseKeyField, type LicenseStatus } from '@/components/molecules/LicenseKeyField'

export interface LicenseApplyIslandProps {
  className?: string
}

export function LicenseApplyIsland({ className }: LicenseApplyIslandProps) {
  const { state, setState, mounted } = useCanonicalStore()
  const [status, setStatus] = useState<LicenseStatus>('idle')
  const [message, setMessage] = useState<string | undefined>(undefined)

  async function handleVerify(key: string) {
    setStatus('verifying')
    setMessage(undefined)
    const result = await verifyLicenseKey(key)

    if (result.isPro) {
      // 署名検証済みのキーのみ端末内へ永続化。派生値（plan/exp/status）は保存しない。
      setState((prev) => ({ ...prev, license: { ...prev.license, key } }))
      setStatus('success')
      return
    }
    if (result.status === 'unsupported') {
      setStatus('unsupported')
      return
    }
    if (result.status === 'expired') {
      setStatus('error')
      setMessage('このライセンスキーは有効期限が切れています。更新後のキーをご確認ください')
      return
    }
    // invalid / none: LicenseKeyField の既定メッセージに委ねる。
    setStatus('error')
    setMessage(undefined)
  }

  return (
    <section
      className={cn('flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 shadow-sm', className)}
      aria-labelledby="license-apply-heading"
    >
      <div className="flex flex-col gap-1">
        <h3 id="license-apply-heading" className="text-h3 font-bold text-ink">
          購入済みの方: ライセンスキーを入力
        </h3>
        <p className="text-body-sm text-ink-secondary">
          Stripe の購入確認メールに記載のキーを貼り付けて解錠してください。キーはこの端末内にのみ保存されます。
        </p>
      </div>

      {mounted ? (
        <LicenseKeyField
          status={status}
          onVerify={handleVerify}
          message={message}
          defaultValue={state.license.key ?? ''}
        />
      ) : (
        <Skeleton h={48} radius="md" />
      )}

      {status === 'success' && (
        <Link href="/app" className="text-body-sm text-primary-ink underline underline-offset-2">
          アプリを開く
        </Link>
      )}
    </section>
  )
}
