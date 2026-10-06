import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetLeafletMock } from '../../../../tests/helpers/leaflet-mock'

const mocks = vi.hoisted(() => ({ createRoad: vi.fn(), updateRoad: vi.fn() }))

vi.mock('leaflet', async () => (await import('../../../../tests/helpers/leaflet-mock')).leafletModule)
vi.mock('@/features/roads/actions', () => ({
  createRoad: mocks.createRoad,
  updateRoad: mocks.updateRoad,
}))

import { RoadForm } from './RoadForm'

// RoadForm (US-02, US-09 road edit; architecture 2.1, 7.2). Client organism. Contract:
//   RoadForm({ mode: 'create' }) | RoadForm({ mode: 'edit', roadId: string, defaultValues: RoadInput })
// - controlled inputs; onSubmit: roadInputSchema.safeParse -> show errors, else
//   startTransition(() => createRoad(input) / updateRoad(roadId, input)); success redirects on the server
// - fields: "道の名前" (Input), "都道府県" (PrefectureSelect), "種別" (ChoiceGroup, default その他), PinPicker
// - errors under each field + summary role="alert" "入力内容を確認してください（N件）" that receives focus
// - selecting 林道 shows the M-08 note with the text label "注意"
// - server errors: fieldErrors under fields, other errors' message in an alert; inputs are kept

const M08 =
  '林道は、舗装されていない区間や道幅の狭い区間があったり、一般車両の通行止めや季節による閉鎖が行われていたりする場合があります。お出かけ前に道路管理者の情報を確認し、通行止めの道には入らないでください。'
const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

const editDefaults = {
  name: '碓氷峠',
  prefectureCode: 10,
  roadType: 'pass' as const,
  start: { lat: 36.35, lng: 138.7 },
  end: { lat: 36.4, lng: 138.65 },
}

function nameInput() {
  return screen.getByRole('textbox', { name: /道の名前/ })
}

function prefectureSelect() {
  return screen.getByRole('combobox', { name: /都道府県/ })
}

function submitButton() {
  return screen.getByRole('button', { name: /保存/ })
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(nameInput(), '碓氷峠')
  await user.selectOptions(prefectureSelect(), '群馬県')
  await user.click(screen.getByRole('radio', { name: '峠' }))
  const startGroup = screen.getByRole('group', { name: /開始地点/ })
  await user.type(within(startGroup).getByLabelText(/緯度/), '36.35')
  await user.type(within(startGroup).getByLabelText(/経度/), '138.7')
}

beforeEach(() => {
  resetLeafletMock()
  mocks.createRoad.mockResolvedValue(undefined)
  mocks.updateRoad.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('RoadForm (create)', () => {
  it('renders the fields; road type defaults to その他 and the 5 types are in PRD order', () => {
    render(<RoadForm mode="create" />)
    expect(nameInput()).toHaveValue('')
    expect(prefectureSelect()).toHaveValue('')
    const typeGroup = screen.getByRole('group', { name: /種別/ })
    expect(within(typeGroup).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'pass',
      'skyline',
      'coastal',
      'forest',
      'other',
    ])
    expect(within(typeGroup).getByRole('radio', { name: 'その他' })).toBeChecked()
  })

  it('has no memo / speed / time fields (PRD US-04, US-14)', () => {
    render(<RoadForm mode="create" />)
    expect(screen.queryByLabelText(/メモ|速度|タイム|時刻|所要時間/)).not.toBeInTheDocument()
  })

  it('marks name, prefecture and start pin as required with the text "必須"', () => {
    render(<RoadForm mode="create" />)
    expect(screen.getAllByText('必須').length).toBeGreaterThanOrEqual(2)
  })

  it('submitting empty shows the 3 required errors, a focused summary, and does not call the server', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="create" />)

    await user.click(submitButton())

    expect(screen.getByText('道の名前を入力してください')).toBeInTheDocument()
    expect(screen.getByText('都道府県を選んでください')).toBeInTheDocument()
    expect(screen.getByText('地図を動かして開始地点のピンを置いてください')).toBeInTheDocument()
    const summary = screen.getByRole('alert')
    expect(summary).toHaveTextContent('入力内容を確認してください（3件）')
    await waitFor(() => expect(summary).toHaveFocus())
    expect(mocks.createRoad).not.toHaveBeenCalled()
  })

  it('links the name error to the input (aria-invalid + aria-describedby)', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="create" />)

    await user.click(submitButton())

    expect(nameInput()).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput()).toHaveAccessibleDescription(expect.stringContaining('道の名前を入力してください'))
  })

  it('whitespace-only name is treated as empty', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="create" />)
    await user.type(nameInput(), '   ')
    await user.click(submitButton())
    expect(screen.getByText('道の名前を入力してください')).toBeInTheDocument()
  })

  it('a 51-character name shows "50文字以内で入力してください"', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="create" />)
    await fillValidForm(user)
    await user.clear(nameInput())
    await user.type(nameInput(), '道'.repeat(51))

    await user.click(submitButton())

    expect(screen.getByText('50文字以内で入力してください')).toBeInTheDocument()
    expect(mocks.createRoad).not.toHaveBeenCalled()
  })

  it('a 50-character name can be saved', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="create" />)
    await fillValidForm(user)
    await user.clear(nameInput())
    await user.type(nameInput(), '道'.repeat(50))

    await user.click(submitButton())

    await waitFor(() => expect(mocks.createRoad).toHaveBeenCalledTimes(1))
  })

  it('selecting 林道 shows the M-08 note with the label 注意; switching away hides it', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="create" />)
    expect(screen.queryByText(M08)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '林道' }))
    expect(screen.getByText(M08)).toBeInTheDocument()
    expect(screen.getByText('注意')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '峠' }))
    expect(screen.queryByText(M08)).not.toBeInTheDocument()
  })

  it('shows the M-09 pin note', () => {
    render(<RoadForm mode="create" />)
    expect(
      screen.getByText('ピンは道の上に置いてください。自宅など、道以外の場所には置かないでください。'),
    ).toBeInTheDocument()
  })

  it('valid input calls createRoad once with the form values (end pin optional)', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="create" />)
    await fillValidForm(user)

    await user.click(submitButton())

    await waitFor(() => expect(mocks.createRoad).toHaveBeenCalledTimes(1))
    expect(mocks.createRoad).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '碓氷峠',
        prefectureCode: 10,
        roadType: 'pass',
        start: { lat: 36.35, lng: 138.7 },
        end: null,
      }),
    )
    expect(mocks.createRoad.mock.calls[0][0]).not.toHaveProperty('user_id')
    expect(mocks.updateRoad).not.toHaveBeenCalled()
  })

  it('disables the save button while saving (no double submit)', async () => {
    const user = userEvent.setup()
    // Resolve at the end: a never-settling async action would stay entangled with later transitions.
    let finish: (value: unknown) => void = () => {}
    mocks.createRoad.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    render(<RoadForm mode="create" />)
    await fillValidForm(user)

    await user.click(submitButton())

    await waitFor(() => expect(submitButton()).toBeDisabled())
    await user.click(submitButton())
    expect(mocks.createRoad).toHaveBeenCalledTimes(1)

    finish({ ok: false, error: { code: 'unexpected', message: '保存できませんでした。もう一度お試しください。' } })
    await waitFor(() => expect(submitButton()).toBeEnabled())
  })

  it('shows server fieldErrors under the fields and keeps the input', async () => {
    const user = userEvent.setup()
    mocks.createRoad.mockResolvedValue({
      ok: false,
      error: {
        code: 'validation',
        message: '入力内容を確認してください',
        fieldErrors: { start: ['日本国内の位置を指定してください'] },
      },
    })
    render(<RoadForm mode="create" />)
    await fillValidForm(user)

    await user.click(submitButton())

    expect(await screen.findByText('日本国内の位置を指定してください')).toBeInTheDocument()
    expect(nameInput()).toHaveValue('碓氷峠')
    expect(prefectureSelect()).toHaveValue('10')
  })

  it('shows an unexpected server error message and keeps the input', async () => {
    const user = userEvent.setup()
    mocks.createRoad.mockResolvedValue({
      ok: false,
      error: { code: 'unexpected', message: '保存できませんでした。もう一度お試しください。' },
    })
    render(<RoadForm mode="create" />)
    await fillValidForm(user)

    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('保存できませんでした。もう一度お試しください。')
    expect(nameInput()).toHaveValue('碓氷峠')
    await waitFor(() => expect(submitButton()).toBeEnabled())
  })

  it('shows the unauthorized message from the server', async () => {
    const user = userEvent.setup()
    mocks.createRoad.mockResolvedValue({
      ok: false,
      error: { code: 'unauthorized', message: 'ログインし直してください' },
    })
    render(<RoadForm mode="create" />)
    await fillValidForm(user)

    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('ログインし直してください')
  })
})

describe('RoadForm (edit)', () => {
  it('pre-fills every field from defaultValues', () => {
    render(<RoadForm mode="edit" roadId={ROAD_ID} defaultValues={editDefaults} />)
    expect(nameInput()).toHaveValue('碓氷峠')
    expect(prefectureSelect()).toHaveValue('10')
    expect(screen.getByRole('radio', { name: '峠' })).toBeChecked()
    const startGroup = screen.getByRole('group', { name: /開始地点/ })
    expect(within(startGroup).getByLabelText(/緯度/)).toHaveDisplayValue('36.35')
    const endGroup = screen.getByRole('group', { name: /終了地点/ })
    expect(within(endGroup).getByLabelText(/経度/)).toHaveDisplayValue('138.65')
  })

  it('pre-filled 林道 shows the M-08 note immediately', () => {
    render(<RoadForm mode="edit" roadId={ROAD_ID} defaultValues={{ ...editDefaults, roadType: 'forest' }} />)
    expect(screen.getByText(M08)).toBeInTheDocument()
  })

  it('saving calls updateRoad(roadId, input), not createRoad', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="edit" roadId={ROAD_ID} defaultValues={editDefaults} />)
    await user.clear(nameInput())
    await user.type(nameInput(), '碓氷峠旧道')

    await user.click(submitButton())

    await waitFor(() => expect(mocks.updateRoad).toHaveBeenCalledTimes(1))
    expect(mocks.updateRoad).toHaveBeenCalledWith(
      ROAD_ID,
      expect.objectContaining({ ...editDefaults, name: '碓氷峠旧道' }),
    )
    expect(mocks.createRoad).not.toHaveBeenCalled()
  })

  it('the end pin can be cleared before saving', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="edit" roadId={ROAD_ID} defaultValues={editDefaults} />)

    await user.click(screen.getByRole('button', { name: '終了ピンを消す' }))
    await user.click(submitButton())

    await waitFor(() => expect(mocks.updateRoad).toHaveBeenCalledTimes(1))
    expect(mocks.updateRoad.mock.calls[0][1]).toMatchObject({ end: null })
  })

  it('validation rules are the same as create', async () => {
    const user = userEvent.setup()
    render(<RoadForm mode="edit" roadId={ROAD_ID} defaultValues={editDefaults} />)
    await user.clear(nameInput())

    await user.click(submitButton())

    expect(screen.getByText('道の名前を入力してください')).toBeInTheDocument()
    expect(mocks.updateRoad).not.toHaveBeenCalled()
  })
})
