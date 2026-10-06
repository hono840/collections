import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ createDrive: vi.fn(), updateDrive: vi.fn() }))

vi.mock('@/features/drives/actions', () => ({
  createDrive: mocks.createDrive,
  updateDrive: mocks.updateDrive,
}))

import { DriveForm } from './DriveForm'

// DriveForm (architecture 2.1 / 7.2, US-03 / US-04 / US-09 record edit; PRD US-06; UX S-08; design 4-2, 4-3, 4-7).
// Client organism. Contract:
//   DriveForm(
//     | { mode: 'create'; roadId: string; roadName: string; roadType: RoadType; defaultDrivenOn: string }
//     | { mode: 'edit'; roadId: string; driveId: string; roadName: string; roadType: RoadType;
//         defaultValues: DriveInput /* drivenOn, vehicleType, weather, ratings, traffic, memo, roadInfo */ })
//   - FIRST child of the form: SafetyNoticeBanner (role="note", M-01, not dismissible); for 林道 the M-08 note
//     comes right after it
//   - road name shown as text (not editable)
//   - fields: 走行日 (date, required, default defaultDrivenOn), 総合 (RatingInput, required), 景観 / 路面状態 /
//     走りやすさ（道幅・見通し） (RatingInput, optional), 交通量 少/普通/多 + M-35, 車両 四輪/二輪, 天候 晴/曇/雨/雪/その他,
//     メモ (textarea, counter "n/2000"), RoadInfoFieldset (道の情報)
//   - NO time / duration / speed fields
//   - controlled state; submit -> driveInputSchema.safeParse -> errors under fields + summary
//     "入力内容を確認してください（N件）" (role=alert) that takes focus; else startTransition(createDrive(roadId, input)
//     | updateDrive(driveId, input)); roadInfo is sent as null when every item is 記録しない
//   - a returned error never clears the inputs (fieldErrors under fields, other errors' message in an alert)
//   - while saving, a second submit does nothing; キャンセル links back to /roads/<roadId>

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const DRIVE_ID = '0a0b0c0d-1e1f-4a2b-8c3d-4e5f6a7b8c9d'
const M01_TITLE = '運転中は操作しないでください'
const M08 =
  '林道は、舗装されていない区間や道幅の狭い区間があったり、一般車両の通行止めや季節による閉鎖が行われていたりする場合があります。お出かけ前に道路管理者の情報を確認し、通行止めの道には入らないでください。'
const M31 = '保存できませんでした。もう一度お試しください。'

const NONE = { status: null, memo: '' }
const emptyItems = {
  motorcycleBan: NONE,
  nightClosure: NONE,
  winterClosure: NONE,
  toll: NONE,
  parking: NONE,
  toilet: NONE,
  michiNoEki: NONE,
  observatory: NONE,
}

function renderCreate(overrides: Partial<{ roadType: 'pass' | 'forest'; defaultDrivenOn: string }> = {}) {
  return render(
    <DriveForm
      mode="create"
      roadId={ROAD_ID}
      roadName="碓氷峠"
      roadType={overrides.roadType ?? 'pass'}
      defaultDrivenOn={overrides.defaultDrivenOn ?? '2026-10-06'}
    />,
  )
}

const editDefaults = {
  drivenOn: '2026-09-14',
  vehicleType: 'motorcycle' as const,
  weather: 'rain' as const,
  ratingOverall: 4,
  ratingScenery: 2,
  ratingRoadSurface: null,
  ratingEaseOfDriving: null,
  traffic: 'many' as const,
  memo: '霧が出ていた',
  roadInfo: { confirmedOn: '2026-09-14', items: { ...emptyItems, toll: { status: 'free' as const, memo: '' } } },
}

function ratingGroup(name: RegExp) {
  return screen.getByRole('radiogroup', { name })
}

function choiceGroup(name: RegExp) {
  return screen.queryByRole('radiogroup', { name }) ?? screen.getByRole('group', { name })
}

function drivenOnInput() {
  return screen.getByLabelText(/走行日/)
}

function memoInput() {
  return screen.getByRole('textbox', { name: /^メモ/ })
}

function submitButton() {
  return screen.getByRole('button', { name: /保存/ })
}

async function chooseOverall(user: ReturnType<typeof userEvent.setup>, label = '4、良い') {
  await user.click(within(ratingGroup(/^総合/)).getByRole('radio', { name: label }))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-06T03:00:00Z')) // 2026-10-06 12:00 JST
  mocks.createDrive.mockResolvedValue(undefined)
  mocks.updateDrive.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('DriveForm: safety (US-08 / PRD US-06, US-13)', () => {
  it('the safety banner (M-01, role="note") is the first thing in the form and cannot be dismissed', () => {
    renderCreate()
    const form = screen.getByRole('form')
    const [banner] = within(form).getAllByRole('note')
    expect(banner).toHaveTextContent(M01_TITLE)
    expect(banner).toHaveTextContent('記録は安全な場所に停車してから、またはドライブの後に行ってください。')
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument()
    expect(banner.compareDocumentPosition(drivenOnInput()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Nothing focusable or labelled comes before it.
    const firstElement = form.firstElementChild
    expect(firstElement === banner || firstElement?.contains(banner)).toBe(true)
  })

  it('for 林道 shows the M-08 note right below the banner; not for other types', () => {
    const { unmount } = renderCreate({ roadType: 'pass' })
    expect(screen.queryByText(M08)).not.toBeInTheDocument()
    unmount()

    renderCreate({ roadType: 'forest' })
    const note = screen.getByText(M08)
    const banner = screen.getByText(M01_TITLE)
    expect(banner.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(note.compareDocumentPosition(drivenOnInput()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('has no time / duration / speed fields (PRD US-06, US-14)', () => {
    const { container } = renderCreate()
    expect(screen.queryByLabelText(/速度|タイム|時刻|所要時間|ラップ|順位|ランキング/)).not.toBeInTheDocument()
    expect(container.querySelector('input[type="time"], input[type="datetime-local"], input[type="number"]')).toBeNull()
  })
})

describe('DriveForm: fields', () => {
  it('names the form and shows the road name as text (not an input)', () => {
    renderCreate()
    expect(screen.getByRole('form', { name: '走行記録の登録フォーム' })).toBeInTheDocument()
    expect(screen.getByText('碓氷峠')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /道の名前/ })).not.toBeInTheDocument()
  })

  it('走行日 is a required date field defaulting to defaultDrivenOn', () => {
    renderCreate({ defaultDrivenOn: '2026-10-06' })
    expect(drivenOnInput()).toHaveAttribute('type', 'date')
    expect(drivenOnInput()).toHaveValue('2026-10-06')
  })

  it('総合 is required; 景観・路面状態・走りやすさ are optional scale bars with their own words', () => {
    renderCreate()
    expect(ratingGroup(/^総合/)).toHaveAttribute('aria-required', 'true')
    for (const name of [/^景観/, /^路面状態/, /^走りやすさ（道幅・見通し）/]) {
      expect(ratingGroup(name)).not.toHaveAttribute('aria-required', 'true')
    }
    expect(within(ratingGroup(/^路面状態/)).getByRole('radio', { name: '1、荒れている' })).toBeInTheDocument()
    expect(
      within(ratingGroup(/^走りやすさ/)).getByRole('radio', { name: '5、とても走りやすい' }),
    ).toBeInTheDocument()
    expect(within(ratingGroup(/^景観/)).getByRole('radio', { name: '4、良い' })).toBeInTheDocument()
  })

  it('交通量 is 少 / 普通 / 多 with the neutral note (M-35), not a score', () => {
    renderCreate()
    const traffic = choiceGroup(/^交通量/)
    expect(within(traffic).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'few',
      'normal',
      'many',
    ])
    expect(within(traffic).getByRole('radio', { name: '少' })).toBeInTheDocument()
    expect(screen.getByText('その日の状況の記録です（良い・悪いの評価ではありません）')).toBeInTheDocument()
  })

  it('車両 (四輪 / 二輪) and 天候 (晴 / 曇 / 雨 / 雪 / その他)', () => {
    renderCreate()
    const vehicle = choiceGroup(/^車両/)
    expect(within(vehicle).getByRole('radio', { name: '四輪' })).toBeInTheDocument()
    expect(within(vehicle).getByRole('radio', { name: '二輪' })).toBeInTheDocument()
    const weather = choiceGroup(/^天候/)
    for (const label of ['晴', '曇', '雨', '雪', 'その他']) {
      expect(within(weather).getByRole('radio', { name: label })).toBeInTheDocument()
    }
  })

  it('メモ shows a live counter "n/2000"', async () => {
    const user = userEvent.setup()
    renderCreate()
    expect(screen.getByText('0/2000')).toBeInTheDocument()
    await user.type(memoInput(), '紅葉')
    expect(screen.getByText('2/2000')).toBeInTheDocument()
  })

  it('includes the road info fieldset, all items starting at 記録しない', () => {
    renderCreate()
    const roadInfo = screen.getByRole('group', { name: /^道の情報/ })
    expect(within(roadInfo).getAllByRole('radio', { name: '記録しない', checked: true })).toHaveLength(8)
  })

  it('has a キャンセル link back to the road detail', () => {
    renderCreate()
    expect(screen.getByRole('link', { name: 'キャンセル' })).toHaveAttribute('href', `/roads/${ROAD_ID}`)
  })
})

describe('DriveForm: validation on submit', () => {
  it('without 総合 shows M-14, a focused summary and does not call the server', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.click(submitButton())

    expect(screen.getByText('総合評価を選んでください')).toBeInTheDocument()
    const summary = screen.getByText('入力内容を確認してください（1件）').closest('[role="alert"]') as HTMLElement
    expect(summary).not.toBeNull()
    await waitFor(() => expect(summary).toHaveFocus())
    expect(ratingGroup(/^総合/)).toHaveAttribute('aria-invalid', 'true')
    expect(mocks.createDrive).not.toHaveBeenCalled()
  })

  it('a future 走行日 shows M-13 under 走行日 (date linked to the error) and does not call the server', async () => {
    const user = userEvent.setup()
    renderCreate()
    await chooseOverall(user)
    fireEvent.change(drivenOnInput(), { target: { value: '2026-10-07' } })

    await user.click(submitButton())

    expect(screen.getByText('未来の日付は選べません')).toBeInTheDocument()
    expect(drivenOnInput()).toHaveAttribute('aria-invalid', 'true')
    expect(drivenOnInput()).toHaveAccessibleDescription(expect.stringContaining('未来の日付は選べません'))
    expect(mocks.createDrive).not.toHaveBeenCalled()
  })

  it('a 2001-character memo shows "2000文字以内で入力してください"', async () => {
    const user = userEvent.setup()
    renderCreate()
    await chooseOverall(user)
    fireEvent.change(memoInput(), { target: { value: 'あ'.repeat(2001) } })

    await user.click(submitButton())

    expect(screen.getByText('2000文字以内で入力してください')).toBeInTheDocument()
    expect(mocks.createDrive).not.toHaveBeenCalled()
  })

  it('errors keep every input as typed', async () => {
    const user = userEvent.setup()
    renderCreate()
    await user.type(memoInput(), '景色がよかった')
    await user.click(within(ratingGroup(/^景観/)).getByRole('radio', { name: '5、とても良い' }))
    await user.click(within(choiceGroup(/^天候/)).getByRole('radio', { name: '晴' }))

    await user.click(submitButton()) // 総合 missing

    expect(memoInput()).toHaveValue('景色がよかった')
    expect(within(ratingGroup(/^景観/)).getByRole('radio', { name: '5、とても良い' })).toBeChecked()
    expect(within(choiceGroup(/^天候/)).getByRole('radio', { name: '晴' })).toBeChecked()
    expect(drivenOnInput()).toHaveValue('2026-10-06')
  })
})

describe('DriveForm: submit (create)', () => {
  it('calls createDrive(roadId, input) with the values; roadInfo null when nothing is recorded', async () => {
    const user = userEvent.setup()
    renderCreate()
    await chooseOverall(user)
    await user.click(within(ratingGroup(/^景観/)).getByRole('radio', { name: '5、とても良い' }))
    await user.click(within(choiceGroup(/^交通量/)).getByRole('radio', { name: '少' }))
    await user.click(within(choiceGroup(/^車両/)).getByRole('radio', { name: '二輪' }))
    await user.click(within(choiceGroup(/^天候/)).getByRole('radio', { name: '曇' }))
    await user.type(memoInput(), '紅葉')

    await user.click(submitButton())

    await waitFor(() => expect(mocks.createDrive).toHaveBeenCalledTimes(1))
    expect(mocks.createDrive).toHaveBeenCalledWith(ROAD_ID, {
      drivenOn: '2026-10-06',
      vehicleType: 'motorcycle',
      weather: 'cloudy',
      ratingOverall: 4,
      ratingScenery: 5,
      ratingRoadSurface: null,
      ratingEaseOfDriving: null,
      traffic: 'few',
      memo: '紅葉',
      roadInfo: null,
    })
  })

  it('sends the road info when at least one item is recorded', async () => {
    const user = userEvent.setup()
    renderCreate()
    await chooseOverall(user)
    const roadInfo = screen.getByRole('group', { name: /^道の情報/ })
    const motorcycleBan =
      within(roadInfo).queryByRole('radiogroup', { name: /^二輪通行止め/ }) ??
      within(roadInfo).getByRole('group', { name: /^二輪通行止め/ })
    await user.click(within(motorcycleBan).getByRole('radio', { name: 'あり' }))
    await user.type(screen.getByRole('textbox', { name: '二輪通行止めのメモ' }), '土日のみ')

    await user.click(submitButton())

    await waitFor(() => expect(mocks.createDrive).toHaveBeenCalledTimes(1))
    const [, input] = mocks.createDrive.mock.calls[0]
    expect(input.roadInfo).toEqual({
      confirmedOn: null,
      items: { ...emptyItems, motorcycleBan: { status: 'yes', memo: '土日のみ' } },
    })
  })

  it('a server error keeps the inputs and shows its message (M-31)', async () => {
    const user = userEvent.setup()
    mocks.createDrive.mockResolvedValue({ ok: false, error: { code: 'unexpected', message: M31 } })
    renderCreate()
    await chooseOverall(user, '3、ふつう')
    await user.type(memoInput(), '消えないで')

    await user.click(submitButton())

    expect(await screen.findByText(M31)).toBeInTheDocument()
    expect(memoInput()).toHaveValue('消えないで')
    expect(within(ratingGroup(/^総合/)).getByRole('radio', { name: '3、ふつう' })).toBeChecked()
  })

  it("server fieldErrors are shown under their fields (e.g. the DB's JST future-date check)", async () => {
    const user = userEvent.setup()
    mocks.createDrive.mockResolvedValue({
      ok: false,
      error: { code: 'validation', message: '入力内容を確認してください', fieldErrors: { drivenOn: ['未来の日付は選べません'] } },
    })
    renderCreate()
    await chooseOverall(user)

    await user.click(submitButton())

    expect(await screen.findByText('未来の日付は選べません')).toBeInTheDocument()
    expect(drivenOnInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('server road info errors (dotted paths) are shown in the fieldset', async () => {
    const user = userEvent.setup()
    mocks.createDrive.mockResolvedValue({
      ok: false,
      error: {
        code: 'validation',
        message: '入力内容を確認してください',
        fieldErrors: { 'roadInfo.confirmedOn': ['未来の日付は選べません'] },
      },
    })
    renderCreate()
    await chooseOverall(user)
    const roadInfo = screen.getByRole('group', { name: /^道の情報/ })
    const toll =
      within(roadInfo).queryByRole('radiogroup', { name: /^有料/ }) ?? within(roadInfo).getByRole('group', { name: /^有料/ })
    await user.click(within(toll).getByRole('radio', { name: '無料' }))

    await user.click(submitButton())

    await waitFor(() =>
      expect(within(roadInfo).getByLabelText(/確認日/)).toHaveAccessibleDescription(
        expect.stringContaining('未来の日付は選べません'),
      ),
    )
  })

  it('while saving, a second submit does not call the server again', async () => {
    const user = userEvent.setup()
    mocks.createDrive.mockReturnValue(new Promise(() => {}))
    renderCreate()
    await chooseOverall(user)

    await user.click(submitButton())
    await user.click(submitButton())

    expect(mocks.createDrive).toHaveBeenCalledTimes(1)
  })
})

describe('DriveForm: edit', () => {
  function renderEdit() {
    return render(
      <DriveForm
        mode="edit"
        roadId={ROAD_ID}
        driveId={DRIVE_ID}
        roadName="碓氷峠"
        roadType="pass"
        defaultValues={editDefaults}
      />,
    )
  }

  it('is named as the edit form and still shows the safety banner first', () => {
    renderEdit()
    const form = screen.getByRole('form', { name: '走行記録の編集フォーム' })
    expect(within(form).getByText(M01_TITLE)).toBeInTheDocument()
  })

  it('prefills every field from defaultValues', () => {
    renderEdit()
    expect(drivenOnInput()).toHaveValue('2026-09-14')
    expect(within(ratingGroup(/^総合/)).getByRole('radio', { name: '4、良い' })).toBeChecked()
    expect(within(ratingGroup(/^景観/)).getByRole('radio', { name: '2、やや物足りない' })).toBeChecked()
    expect(within(choiceGroup(/^交通量/)).getByRole('radio', { name: '多' })).toBeChecked()
    expect(within(choiceGroup(/^車両/)).getByRole('radio', { name: '二輪' })).toBeChecked()
    expect(within(choiceGroup(/^天候/)).getByRole('radio', { name: '雨' })).toBeChecked()
    expect(memoInput()).toHaveValue('霧が出ていた')
    const roadInfo = screen.getByRole('group', { name: /^道の情報/ })
    expect(within(roadInfo).getByLabelText(/確認日/)).toHaveValue('2026-09-14')
  })

  it('calls updateDrive(driveId, input) and never sends a road id', async () => {
    const user = userEvent.setup()
    renderEdit()
    await user.clear(memoInput())
    await user.type(memoInput(), '晴れていた')

    await user.click(submitButton())

    await waitFor(() => expect(mocks.updateDrive).toHaveBeenCalledTimes(1))
    const [driveId, input] = mocks.updateDrive.mock.calls[0]
    expect(driveId).toBe(DRIVE_ID)
    expect(input).toMatchObject({ drivenOn: '2026-09-14', ratingOverall: 4, memo: '晴れていた' })
    expect(input).not.toHaveProperty('roadId')
    expect(input).not.toHaveProperty('road_id')
    expect(mocks.createDrive).not.toHaveBeenCalled()
  })

  it('clearing every road info item sends roadInfo: null (the row is removed)', async () => {
    const user = userEvent.setup()
    renderEdit()
    const roadInfo = screen.getByRole('group', { name: /^道の情報/ })
    const toll =
      within(roadInfo).queryByRole('radiogroup', { name: /^有料/ }) ?? within(roadInfo).getByRole('group', { name: /^有料/ })
    await user.click(within(toll).getByRole('radio', { name: '記録しない' }))

    await user.click(submitButton())

    await waitFor(() => expect(mocks.updateDrive).toHaveBeenCalledTimes(1))
    expect(mocks.updateDrive.mock.calls[0][1].roadInfo).toBeNull()
  })
})
