/**
 * 推し国診断のスコアリング（純関数）。
 *
 * 回答（questionId → optionId）を、各選択肢の属性重みに展開し、
 * チームの属性（style/tier/region/vibe）とマッチした分を加点してランキングする。
 */
import type { CountryCode, Team } from '@/lib/domain'
import {
  DIAGNOSIS_QUESTIONS,
  type AnswerWeights,
  type DiagnosisQuestion,
} from './questions'

/** 回答マップ（questionId → optionId） */
export type DiagnosisAnswers = Record<string, string>

export interface ScoredTeam {
  code: CountryCode
  score: number
}

/** questionId → DiagnosisQuestion の索引 */
function buildQuestionIndex(): Map<string, DiagnosisQuestion> {
  return new Map(DIAGNOSIS_QUESTIONS.map((q) => [q.id, q]))
}

/** 1チーム・1選択肢のマッチ加点を計算 */
function scoreTeamForWeights(team: Team, weights: AnswerWeights): number {
  let score = 0

  if (weights.style) {
    score += weights.style[team.style] ?? 0
  }
  if (weights.tier) {
    score += weights.tier[team.tier] ?? 0
  }
  if (weights.region) {
    score += weights.region[team.region] ?? 0
  }
  if (weights.vibe) {
    for (const tag of team.vibeJa) {
      score += weights.vibe[tag] ?? 0
    }
  }

  return score
}

/**
 * 回答とチーム一覧から、スコア降順のチームを返す（同点はコード昇順で安定）。
 */
export function scoreTeams(
  answers: DiagnosisAnswers,
  teams: Team[],
): ScoredTeam[] {
  const questionIndex = buildQuestionIndex()

  // 選択された選択肢の重みを収集
  const selectedWeights: AnswerWeights[] = []
  for (const [questionId, optionId] of Object.entries(answers)) {
    const question = questionIndex.get(questionId)
    if (!question) continue
    const option = question.options.find((o) => o.id === optionId)
    if (!option) continue
    selectedWeights.push(option.weights)
  }

  const scored: ScoredTeam[] = teams.map((team) => {
    let total = 0
    for (const weights of selectedWeights) {
      total += scoreTeamForWeights(team, weights)
    }
    return { code: team.code, score: total }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.code.localeCompare(b.code)
  })

  return scored
}

/**
 * 推し国コードのランキング（上位 limit 件）を返す。
 */
export function score(
  answers: DiagnosisAnswers,
  teams: Team[],
  limit = 5,
): CountryCode[] {
  return scoreTeams(answers, teams)
    .slice(0, limit)
    .map((s) => s.code)
}
