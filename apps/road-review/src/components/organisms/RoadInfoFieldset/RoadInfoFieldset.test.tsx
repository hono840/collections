import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { emptyRoadInfoInput, type RoadInfoInput } from '@/lib/validation/road-info'
import { RoadInfoFieldset } from './RoadInfoFieldset'

// RoadInfoFieldset (architecture 2.1: organism inside DriveForm; items/copy from PRD US-10, UX 3.1 S-14,
// design spec 4-6 RoadInfoForm). Client organism (no data access of its own).
// Contract:
//   RoadInfoFieldset({ value: RoadInfoInput; onChange(next: RoadInfoInput): void;
//                      errors?: { confirmedOn?: string; form?: string; memos?: Partial<Record<RoadInfoItem, string>> };
//                      className? })
//   - a group (fieldset) named "道の情報"
//   - "確認日" date input (empty = the drive date) + hint M-32 "記録しない以外を選んだ項目に、この日付が付きます。"
//   - headings "通行ルール" (二輪通行止め / 夜間通行止め / 冬季閉鎖 / 有料) and "施設" (駐車場 / トイレ / 道の駅 / 展望台)
//   - one radio group per item named by the item; options あり / なし / 不明 / 記録しない
//     (有料: 有料 / 無料 / 不明 / 記録しない); 記録しない is checked while status is null
//   - choosing anything but 記録しない shows "<item>のメモ" (maxLength 200, counter "n/200");
//     going back to 記録しない hides it (and the schema drops the memo)
//   - M-06 note at the end
//   - errors: confirmedOn under 確認日, form (M-27) at the top, memos under each memo field

const M06 = 'これはあなた自身の記録で、公式情報ではありません。お出かけ前に道路管理者の公式情報を確認してください。'
const M32 = '記録しない以外を選んだ項目に、この日付が付きます。'

function Harness({
  initial,
  onChange = vi.fn(),
  errors,
}: {
  initial?: RoadInfoInput
  onChange?: (next: RoadInfoInput) => void
  errors?: Parameters<typeof RoadInfoFieldset>[0]['errors']
}) {
  const [value, setValue] = useState<RoadInfoInput>(initial ?? emptyRoadInfoInput())
  return (
    <RoadInfoFieldset
      value={value}
      errors={errors}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

/** One item = one radio group (a fieldset "group" or an ARIA "radiogroup"), named by the item. */
function itemGroup(name: string) {
  const matcher = new RegExp(`^${name}`)
  return screen.queryByRole('radiogroup', { name: matcher }) ?? screen.getByRole('group', { name: matcher })
}

function optionLabels(groupElement: HTMLElement) {
  return within(groupElement)
    .getAllByRole('radio')
    .map((radio) => radio.getAttribute('aria-label') ?? (radio as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? '')
}

describe('RoadInfoFieldset: structure', () => {
  it('is a group named 道の情報 with the M-06 note', () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: /^道の情報/ })).toBeInTheDocument()
    expect(screen.getByText(M06)).toBeInTheDocument()
  })

  it('has one shared 確認日 (empty by default) with the M-32 hint', () => {
    render(<Harness />)
    const confirmedOn = screen.getByLabelText(/確認日/)
    expect(confirmedOn).toHaveAttribute('type', 'date')
    expect(confirmedOn).toHaveValue('')
    expect(confirmedOn).toHaveAccessibleDescription(expect.stringContaining(M32))
  })

  it('groups the 4 road rules and the 4 facilities under headings, in PRD order', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: '通行ルール' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '施設' })).toBeInTheDocument()
    const names = ['二輪通行止め', '夜間通行止め', '冬季閉鎖', '有料', '駐車場', 'トイレ', '道の駅', '展望台']
    const groups = names.map((name) => itemGroup(name))
    for (let index = 1; index < groups.length; index += 1) {
      expect(groups[index - 1].compareDocumentPosition(groups[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('presence items offer あり / なし / 不明 / 記録しない; 有料 offers 有料 / 無料 / 不明 / 記録しない', () => {
    render(<Harness />)
    expect(optionLabels(itemGroup('二輪通行止め'))).toEqual(['あり', 'なし', '不明', '記録しない'])
    expect(optionLabels(itemGroup('展望台'))).toEqual(['あり', 'なし', '不明', '記録しない'])
    expect(optionLabels(itemGroup('有料'))).toEqual(['有料', '無料', '不明', '記録しない'])
  })

  it('every item starts at 記録しない and no memo field is shown', () => {
    render(<Harness />)
    for (const name of ['二輪通行止め', '夜間通行止め', '冬季閉鎖', '有料', '駐車場', 'トイレ', '道の駅', '展望台']) {
      expect(within(itemGroup(name)).getByRole('radio', { name: '記録しない' })).toBeChecked()
    }
    expect(screen.queryByRole('textbox', { name: /のメモ/ })).not.toBeInTheDocument()
  })

  it('has no speed / time inputs', () => {
    const { container } = render(<Harness />)
    expect(screen.queryByLabelText(/速度|タイム|時刻|所要時間/)).not.toBeInTheDocument()
    expect(container.querySelector('input[type="time"], input[type="datetime-local"]')).toBeNull()
  })
})

describe('RoadInfoFieldset: editing', () => {
  it('choosing あり sets the status and reveals the item memo (200 chars, counter)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(within(itemGroup('二輪通行止め')).getByRole('radio', { name: 'あり' }))

    const last = onChange.mock.lastCall?.[0] as RoadInfoInput
    expect(last.items.motorcycleBan.status).toBe('yes')
    expect(last.items.toll.status).toBeNull()
    const memo = screen.getByRole('textbox', { name: '二輪通行止めのメモ' })
    expect(memo).toHaveAttribute('maxLength', '200')
    expect(screen.getByText('0/200')).toBeInTheDocument()

    await user.type(memo, '土日のみ')
    expect((onChange.mock.lastCall?.[0] as RoadInfoInput).items.motorcycleBan.memo).toBe('土日のみ')
    expect(screen.getByText('4/200')).toBeInTheDocument()
  })

  it('有料 maps 無料 to "free"', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(within(itemGroup('有料')).getByRole('radio', { name: '無料' }))
    expect((onChange.mock.lastCall?.[0] as RoadInfoInput).items.toll.status).toBe('free')
  })

  it('going back to 記録しない hides the memo and sets status null', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(within(itemGroup('駐車場')).getByRole('radio', { name: '不明' }))
    expect(screen.getByRole('textbox', { name: '駐車場のメモ' })).toBeInTheDocument()
    await user.click(within(itemGroup('駐車場')).getByRole('radio', { name: '記録しない' }))

    expect((onChange.mock.lastCall?.[0] as RoadInfoInput).items.parking.status).toBeNull()
    expect(screen.queryByRole('textbox', { name: '駐車場のメモ' })).not.toBeInTheDocument()
  })

  it('entering 確認日 updates confirmedOn; clearing it sets null', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const confirmedOn = screen.getByLabelText(/確認日/)

    fireEvent.change(confirmedOn, { target: { value: '2026-10-01' } })
    expect((onChange.mock.lastCall?.[0] as RoadInfoInput).confirmedOn).toBe('2026-10-01')

    fireEvent.change(confirmedOn, { target: { value: '' } })
    expect((onChange.mock.lastCall?.[0] as RoadInfoInput).confirmedOn).toBeNull()
  })

  it('shows existing values (edit mode)', () => {
    const initial = emptyRoadInfoInput()
    initial.confirmedOn = '2026-09-12'
    initial.items.nightClosure = { status: 'yes', memo: '22時〜6時' }
    render(<Harness initial={initial} />)

    expect(screen.getByLabelText(/確認日/)).toHaveValue('2026-09-12')
    expect(within(itemGroup('夜間通行止め')).getByRole('radio', { name: 'あり' })).toBeChecked()
    expect(screen.getByRole('textbox', { name: '夜間通行止めのメモ' })).toHaveValue('22時〜6時')
  })
})

describe('RoadInfoFieldset: errors', () => {
  it('shows the M-27 form error, the 確認日 error and a memo error where they belong', () => {
    const initial = emptyRoadInfoInput()
    initial.items.toll = { status: 'paid', memo: 'x'.repeat(201) }
    render(
      <Harness
        initial={initial}
        errors={{
          form: '少なくとも1つの項目を選んでください',
          confirmedOn: '未来の日付は選べません',
          memos: { toll: '200文字以内で入力してください' },
        }}
      />,
    )

    expect(screen.getByText('少なくとも1つの項目を選んでください')).toBeInTheDocument()
    expect(screen.getByLabelText(/確認日/)).toHaveAccessibleDescription(expect.stringContaining('未来の日付は選べません'))
    const tollMemo = screen.getByRole('textbox', { name: '有料のメモ' })
    expect(tollMemo).toHaveAttribute('aria-invalid', 'true')
    expect(tollMemo).toHaveAccessibleDescription(expect.stringContaining('200文字以内で入力してください'))
  })
})
