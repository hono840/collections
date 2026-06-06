import type { Metadata } from 'next'
import { QuizTemplate } from '@/components/templates/QuizTemplate'
import { DiagnosisQuiz } from '@/components/organisms/DiagnosisQuiz'
import { getRepository } from '@/lib/data'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '推し国診断',
  description:
    'かんたんな質問に答えるだけで、あなたにぴったりの「推し国」を提案します。日本のほかにもう一国、応援する国を見つけよう。',
}

/**
 * 推し国診断ページ（Server Component）。
 * scoring に必要な全チーム属性を Server で取得し、Client の DiagnosisQuiz に渡す。
 * 進行・結果表示・localStorage 保存は DiagnosisQuiz / DiagnosisResultCard 側が担当。
 */
export default async function DiagnosisPage() {
  const teams = await getRepository().getTeams()

  return (
    <div className="flex flex-col gap-4 py-2">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-extrabold text-text">推し国診断</h1>
        <p className="text-sm text-text-muted">
          6つの質問に答えて、あなたの推し国を見つけよう。
        </p>
      </header>
      <QuizTemplate>
        <DiagnosisQuiz teams={teams} />
      </QuizTemplate>
    </div>
  )
}
