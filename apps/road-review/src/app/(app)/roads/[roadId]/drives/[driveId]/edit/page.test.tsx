import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

// /roads/[roadId]/drives/[driveId]/edit (UX S-08 edit, architecture US-09 record edit). Server Component page:
//   getRoad(roadId) and getDrive(roadId, driveId); either null => notFound()
//   (missing / other user's / a drive of a different road / malformed ids: the same 404, PRD 6)
//   found => FormPageTemplate title "走行記録を編集" + DriveForm mode="edit" with driveId and defaultValues
//            mapped from the drive (drivenOn, vehicleType, weather, ratings, traffic, memo, roadInfo)
//   metadata.title = '走行記録を編集'

const mocks = vi.hoisted(() => ({
  getRoad: vi.fn(),
  getDrive: vi.fn(),
  notFound: vi.fn(() => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  }),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, redirect: vi.fn() }))
vi.mock('@/features/roads/queries', () => ({ getRoad: mocks.getRoad, listRoadSummaries: vi.fn() }))
vi.mock('@/features/drives/queries', () => ({
  getDrive: mocks.getDrive,
  listDrives: vi.fn(),
  getLatestRoadInfo: vi.fn(),
}))
vi.mock('@/features/drives/actions', () => ({ createDrive: vi.fn(), updateDrive: vi.fn() }))

import EditDrivePage, { metadata } from './page'

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const DRIVE_ID = '0a0b0c0d-1e1f-4a2b-8c3d-4e5f6a7b8c9d'
const NONE = { status: null, memo: '' }

const road = {
  id: ROAD_ID,
  name: '碓氷峠',
  prefectureCode: 10,
  roadType: 'pass' as const,
  start: { lat: 36.35, lng: 138.7 },
  end: null,
  createdAt: '2026-10-07T03:00:00+00:00',
  updatedAt: '2026-10-07T03:00:00+00:00',
}

const drive = {
  id: DRIVE_ID,
  roadId: ROAD_ID,
  drivenOn: '2026-09-14',
  vehicleType: 'car' as const,
  weather: 'cloudy' as const,
  ratingOverall: 2,
  ratingScenery: null,
  ratingRoadSurface: 4,
  ratingEaseOfDriving: null,
  traffic: 'normal' as const,
  memo: '工事中だった',
  createdAt: '2026-09-14T09:00:00+00:00',
  updatedAt: '2026-09-14T09:00:00+00:00',
  roadInfo: {
    confirmedOn: '2026-09-14',
    items: {
      motorcycleBan: NONE,
      nightClosure: { status: 'yes' as const, memo: '22時〜6時' },
      winterClosure: NONE,
      toll: NONE,
      parking: NONE,
      toilet: NONE,
      michiNoEki: NONE,
      observatory: NONE,
    },
  },
}

async function renderPage(roadId = ROAD_ID, driveId = DRIVE_ID) {
  const element = await EditDrivePage({ params: Promise.resolve({ roadId, driveId }) })
  return render(element)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('/roads/[roadId]/drives/[driveId]/edit page', () => {
  it('has the page title', () => {
    expect(metadata.title).toBe('走行記録を編集')
  })

  it('loads the road and the drive of that road', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.getDrive.mockResolvedValue(drive)
    await renderPage()
    expect(mocks.getRoad).toHaveBeenCalledWith(ROAD_ID)
    expect(mocks.getDrive).toHaveBeenCalledWith(ROAD_ID, DRIVE_ID)
    expect(screen.getByRole('heading', { level: 1, name: '走行記録を編集' })).toBeInTheDocument()
  })

  it('prefills the form from the drive (including its road info) and shows the safety banner', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.getDrive.mockResolvedValue(drive)
    await renderPage()

    expect(screen.getAllByRole('note')[0]).toHaveTextContent('運転中は操作しないでください')
    expect(screen.getByLabelText(/走行日/)).toHaveValue('2026-09-14')
    expect(screen.getByRole('textbox', { name: /^メモ/ })).toHaveValue('工事中だった')
    expect(
      within(screen.getByRole('radiogroup', { name: /^総合/ })).getByRole('radio', { name: '2、やや物足りない' }),
    ).toBeChecked()
    expect(screen.getByRole('textbox', { name: '夜間通行止めのメモ' })).toHaveValue('22時〜6時')
    expect(screen.getByRole('form', { name: '走行記録の編集フォーム' })).toBeInTheDocument()
  })

  it('404 when the drive is not found or belongs to another road', async () => {
    mocks.getRoad.mockResolvedValue(road)
    mocks.getDrive.mockResolvedValue(null)
    await expect(renderPage()).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('404 when the road is not visible', async () => {
    mocks.getRoad.mockResolvedValue(null)
    mocks.getDrive.mockResolvedValue(drive)
    await expect(renderPage()).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })
})
