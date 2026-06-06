'use client'

import Link from 'next/link'
import { Compass, Sparkles, BookOpen } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { CountryFlag } from '@/components/atoms/CountryFlag'
import { CountdownTimer } from '@/components/molecules/CountdownTimer'
import { useFavoriteTeamContext } from '@/components/providers/FavoriteTeamProvider'
import { KICKOFF_DATE } from '@/lib/constants/tournament'
import { cn } from '@/lib/utils/cn'

/** 推し国カード表示のための最小チーム情報（Server から渡すシリアライズ可能値） */
export interface HomeHeroTeam {
  code: string
  nameJa: string
  flagEmoji: string
}

export interface HomeHeroProps {
  /**
   * 推し国の解決用マップ（code → 表示情報）。
   * 推し国は localStorage 由来で Client でしか確定しないため、
   * Server から全チームの最小情報を渡し、Client で該当コードを引く。
   */
  teamsByCode: Record<string, HomeHeroTeam>
  className?: string
}

/**
 * ホームのヒーロー。Client Component。
 * - 大きな開幕カウントダウン（開幕後は「開催中！」表示）
 * - 「まず3分でW杯を知ろう」「推し国は？診断」の 2 大導線
 * - 推し国（localStorage）: 設定済みなら国旗+国名+国ページリンク、未設定なら診断 CTA
 *
 * データ取得は行わず、Server から渡された teamsByCode のみを参照する。
 */
export function HomeHero({ teamsByCode, className }: HomeHeroProps) {
  const { favoriteTeam, mounted } = useFavoriteTeamContext()
  const favorite =
    favoriteTeam != null ? teamsByCode[favoriteTeam] : undefined

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* ── ヒーロー本体: タイトル + カウントダウン ── */}
      <Card
        padding="lg"
        className="flex flex-col items-center gap-3 text-center"
      >
        <Badge variant="kickoff">2026 FIFA ワールドカップ</Badge>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-tight text-text">
          <span aria-hidden className="text-3xl">
            ⚽
          </span>
          <span>ワールドカップ 2026</span>
        </h1>
        <p className="text-sm text-text-muted">
          ルールも選手も知らなくて大丈夫。観て学べる初心者ガイド。
        </p>

        <div className="mt-1 flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-text-muted">
            開幕（日本時間 6月12日）まであと
          </span>
          <CountdownTimer
            target={KICKOFF_DATE}
            size="lg"
            completeLabel="開催中！"
          />
        </div>
      </Card>

      {/* ── 3分導線（最重要 CTA 2 枚）── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/rules/soccer-basics"
          className="group block rounded-2xl"
        >
          <Card
            interactive
            padding="md"
            highlighted
            className="flex h-full items-center gap-3"
          >
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pitch-100 text-pitch-700"
              aria-hidden
            >
              <BookOpen className="h-6 w-6" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-bold text-text">
                まず3分でW杯を知ろう
              </span>
              <span className="text-xs leading-snug text-text-muted">
                サッカーの超基本から
              </span>
            </span>
          </Card>
        </Link>

        <Link href="/diagnosis" className="group block rounded-2xl">
          <Card
            interactive
            padding="md"
            highlighted
            className="flex h-full items-center gap-3"
          >
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700"
              aria-hidden
            >
              <Sparkles className="h-6 w-6" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-bold text-text">
                あなたの推し国は？診断
              </span>
              <span className="text-xs leading-snug text-text-muted">
                3分で応援する国が見つかる
              </span>
            </span>
          </Card>
        </Link>
      </div>

      {/* ── 推し国（localStorage 依存・mounted ガード）── */}
      <section aria-labelledby="favorite-heading">
        <h2
          id="favorite-heading"
          className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text"
        >
          <Compass className="h-4 w-4 text-pitch-600" aria-hidden />
          あなたの推し国
        </h2>

        {!mounted ? (
          // 未水和中はレイアウトずれ防止のプレースホルダ
          <Card padding="md" aria-hidden>
            <div className="h-12" />
          </Card>
        ) : favorite ? (
          <Link
            href={`/countries/${favorite.code}`}
            className="block rounded-2xl"
          >
            <Card
              interactive
              padding="md"
              highlighted
              className="flex items-center gap-3"
            >
              <CountryFlag
                flagEmoji={favorite.flagEmoji}
                nameJa={favorite.nameJa}
                size="lg"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-extrabold text-text">
                  {favorite.nameJa}
                </span>
                <span className="text-xs text-text-muted">
                  国の見どころ・試合を見る
                </span>
              </span>
            </Card>
          </Link>
        ) : (
          <Link href="/diagnosis" className="block rounded-2xl">
            <Card interactive padding="md" className="flex flex-col gap-1">
              <span className="text-sm font-bold text-text">
                まだ推し国がありません
              </span>
              <span className="text-xs text-text-muted">
                診断で応援する国を見つけよう →
              </span>
            </Card>
          </Link>
        )}
      </section>
    </div>
  )
}
