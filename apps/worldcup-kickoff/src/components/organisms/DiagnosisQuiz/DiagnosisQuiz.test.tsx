import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DiagnosisQuiz } from './DiagnosisQuiz'
import { FavoriteTeamProvider } from '@/components/providers/FavoriteTeamProvider'
import { DIAGNOSIS_QUESTIONS } from '@/lib/diagnosis/questions'
import type { Team } from '@/lib/domain'

beforeEach(() => {
  localStorage.clear()
})

function makeTeam(code: string, overrides: Partial<Team> = {}): Team {
  return {
    code,
    nameEn: code,
    nameJa: code,
    groupId: 'A',
    flagEmoji: '🏳️',
    confed: 'UEFA',
    region: 'europe',
    style: 'attacking',
    tier: 'favorite',
    tierReasonJa: '実績と地力があり優勝を狙えるからです。',
    blurbJa: `${code} の紹介`,
    watchPointJa: '見どころ',
    funFactsJa: [],
    vibeJa: ['華やか'],
    ...overrides,
  }
}

// 攻撃的・優勝候補・欧州・華やかに寄せたチームが上位に来るように仕込む
const teams: Team[] = [
  makeTeam('AAA', { nameJa: 'エース国', vibeJa: ['華やか', 'スター軍団', 'テクニック'] }),
  makeTeam('BBB', {
    nameJa: 'ディフェンス国',
    style: 'defensive',
    tier: 'underdog',
    region: 'asia',
    vibeJa: ['堅守'],
  }),
  makeTeam('CCC', {
    nameJa: 'バランス国',
    style: 'balanced',
    tier: 'darkhorse',
    region: 'africa',
    vibeJa: ['組織力'],
  }),
]

function renderQuiz() {
  return render(
    <FavoriteTeamProvider>
      <DiagnosisQuiz teams={teams} />
    </FavoriteTeamProvider>,
  )
}

/** 各設問で最初の選択肢を選び続けて最後まで回答する */
async function answerAll(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < DIAGNOSIS_QUESTIONS.length; i++) {
    const question = DIAGNOSIS_QUESTIONS[i]
    const firstOptionLabel = question.options[0].label
    const button = await screen.findByRole('button', { name: firstOptionLabel })
    await user.click(button)
  }
}

describe('DiagnosisQuiz', () => {
  it('最初の設問が表示される', () => {
    renderQuiz()
    expect(
      screen.getByText(DIAGNOSIS_QUESTIONS[0].question),
    ).toBeInTheDocument()
  })

  it('進捗表示（質問 1 / N）が出る', () => {
    renderQuiz()
    expect(
      screen.getByText(`質問 1 / ${DIAGNOSIS_QUESTIONS.length}`),
    ).toBeInTheDocument()
  })

  it('選択肢を選ぶと次の設問へ進む', async () => {
    const user = userEvent.setup()
    renderQuiz()
    const firstOptionLabel = DIAGNOSIS_QUESTIONS[0].options[0].label
    await user.click(screen.getByRole('button', { name: firstOptionLabel }))
    expect(
      screen.getByText(`質問 2 / ${DIAGNOSIS_QUESTIONS.length}`),
    ).toBeInTheDocument()
  })

  it('最後まで回答すると推し国（結果）が表示される', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await answerAll(user)
    expect(screen.getByText('あなたの推し国は')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'この国を推しにする' }),
    ).toBeInTheDocument()
  })

  it('結果は localStorage に保存され、再マウント時に結果が表示される', async () => {
    const user = userEvent.setup()
    const { unmount } = renderQuiz()
    await answerAll(user)
    expect(localStorage.getItem('wck:diagnosis-result')).not.toBeNull()

    unmount()
    renderQuiz()
    // 再訪時は設問ではなく結果が出る
    expect(await screen.findByText('あなたの推し国は')).toBeInTheDocument()
  })

  it('やり直しで設問の最初に戻る', async () => {
    const user = userEvent.setup()
    renderQuiz()
    await answerAll(user)
    const retry = screen.getAllByRole('button', {
      name: /もう一度診断する/,
    })[0]
    await user.click(retry)
    expect(
      screen.getByText(`質問 1 / ${DIAGNOSIS_QUESTIONS.length}`),
    ).toBeInTheDocument()
  })
})
