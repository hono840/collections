'use client'
/**
 * OnboardingSheet — first-run flow that gets the user to THE WEDGE fastest (design-spec §5.2 /
 * PRD 10.2). Welcome → 「サンプルで試す」 (seeds the preset ingredients + 唐揚げ定食) or 「自分の食材から」,
 * then a magic-moment tip that names the exact edit (鶏もも肉 ¥900→¥1200) which flips 唐揚げ定食 from
 * green to yellow. The privacy TrustBadge is reinforced on the welcome screen.
 */
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { TrustBadge } from '@/components/molecules/TrustBadge'
import { Sheet } from '@/components/organisms/Sheet'

export interface OnboardingSheetProps {
  open: boolean
  /** Seed the sample data; the sheet then advances to the magic-moment tip. */
  onLoadSample: () => void
  /** Dismiss and start from an empty state. */
  onStartBlank: () => void
  /** Finish after the tip. */
  onFinish: () => void
  className?: string
}

export function OnboardingSheet({ open, onLoadSample, onStartBlank, onFinish, className }: OnboardingSheetProps) {
  const [step, setStep] = useState<'welcome' | 'tip'>('welcome')

  // Always start at the welcome step when (re)opened (render-phase reset).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setStep('welcome')
  }

  const handleClose = step === 'welcome' ? onStartBlank : onFinish

  return (
    <Sheet open={open} onClose={handleClose} title={step === 'welcome' ? '原価電卓へようこそ' : 'サンプルを入れました'} className={className}>
      {step === 'welcome' ? (
        <div className="flex flex-col gap-4">
          <p className="text-body text-ink">
            仕入れ値を1つ直すだけで、全メニューの原価率が一気に変わります。まずは動くもので試してみましょう。
          </p>
          <TrustBadge variant="full" />
          <div className="mt-2 flex flex-col gap-2">
            <Button
              onClick={() => {
                onLoadSample()
                setStep('tip')
              }}
            >
              サンプルで試す
            </Button>
            <Button variant="secondary" onClick={onStartBlank}>
              自分の食材から始める
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-primary-ink">
            <Icon icon={Sparkles} size="lg" />
            <span className="text-h3">1つ変えると、全部が動く</span>
          </div>
          <p className="text-body text-ink">
            「食材」タブで<strong className="text-ink">鶏もも肉</strong>の仕入値を ¥900 → ¥1,200 に変えてみてください。
            唐揚げ定食の原価率が緑（良好）から黄（注意）へ一気に動きます。
          </p>
          <Button onClick={onFinish}>はじめる</Button>
        </div>
      )}
    </Sheet>
  )
}
