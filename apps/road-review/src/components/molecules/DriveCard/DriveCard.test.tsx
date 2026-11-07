import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DriveCard } from './DriveCard'

// DriveCard (architecture 2.1: one drive record; UX S-06 "日付・総合・メモ"). Server molecule.
// Contract: DriveCard({ drive: Drive; roadId: string; className? })   (Drive from src/types/drive.ts)
//   - an <article> named by its date heading; the date is a <time dateTime="YYYY-MM-DD"> showing YYYY-MM-DD
//   - "総合 4" as text + RatingMeter role="img" named "総合評価 4"
//   - optional ratings only when present: "景観 5", "路面状態 3", "走りやすさ 2"
//   - "交通量 少" / "天候 晴" / "二輪" only when present (traffic is a situation, shown without a meter)
//   - memo as plain text (escaped)
//   - a link "編集" (accessible name includes the date) to /roads/<roadId>/drives/<driveId>/edit
//   - never prints null / undefined / NaN, never shows time or speed

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'

const drive = {
  id: '0a0b0c0d-1e1f-4a2b-8c3d-4e5f6a7b8c9d',
  roadId: ROAD_ID,
  drivenOn: '2026-09-14',
  vehicleType: 'motorcycle' as const,
  weather: 'sunny' as const,
  ratingOverall: 4,
  ratingScenery: 5,
  ratingRoadSurface: 3,
  ratingEaseOfDriving: 2,
  traffic: 'few' as const,
  memo: '紅葉がきれいだった',
  createdAt: '2026-09-14T09:00:00+00:00',
  updatedAt: '2026-09-14T09:00:00+00:00',
}

const bareDrive = {
  ...drive,
  vehicleType: null,
  weather: null,
  ratingScenery: null,
  ratingRoadSurface: null,
  ratingEaseOfDriving: null,
  traffic: null,
  memo: '',
}

describe('DriveCard', () => {
  it('is an article named by the drive date, with a machine-readable <time>', () => {
    const { container } = render(<DriveCard drive={drive} roadId={ROAD_ID} />)
    expect(screen.getByRole('article', { name: /2026-09-14/ })).toBeInTheDocument()
    const time = container.querySelector('time')
    expect(time).toHaveAttribute('dateTime', '2026-09-14')
    expect(time).toHaveTextContent('2026-09-14')
  })

  it('shows the overall rating as text and as a meter (no stars)', () => {
    const { container } = render(<DriveCard drive={drive} roadId={ROAD_ID} />)
    expect(screen.getByRole('article')).toHaveTextContent(/総合\s*4/)
    expect(screen.getByRole('img', { name: '総合評価 4' })).toBeInTheDocument()
    expect(container.textContent ?? '').not.toMatch(/[★☆⭐]/)
  })

  it('shows the optional ratings that were entered', () => {
    render(<DriveCard drive={drive} roadId={ROAD_ID} />)
    const article = screen.getByRole('article')
    expect(article).toHaveTextContent(/景観\s*5/)
    expect(article).toHaveTextContent(/路面状態\s*3/)
    expect(article).toHaveTextContent(/走りやすさ\s*2/)
  })

  it('shows traffic, weather and vehicle as words', () => {
    render(<DriveCard drive={drive} roadId={ROAD_ID} />)
    const article = screen.getByRole('article')
    expect(article).toHaveTextContent(/交通量\s*少/)
    expect(article).toHaveTextContent(/天候\s*晴/)
    expect(article).toHaveTextContent('二輪')
  })

  it('hides missing optional values instead of printing placeholders', () => {
    const { container } = render(<DriveCard drive={bareDrive} roadId={ROAD_ID} />)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/景観|路面状態|走りやすさ|交通量|天候|四輪|二輪/)
    expect(text).not.toMatch(/null|undefined|NaN/)
  })

  it('shows the memo as text (not HTML)', () => {
    const { container } = render(
      <DriveCard drive={{ ...drive, memo: '<img src=x onerror=alert(1)>' }} roadId={ROAD_ID} />,
    )
    expect(container.querySelector('img[src="x"]')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })

  it('links to the edit page of this drive', () => {
    render(<DriveCard drive={drive} roadId={ROAD_ID} />)
    const link = screen.getByRole('link', { name: /編集/ })
    expect(link).toHaveAttribute('href', `/roads/${ROAD_ID}/drives/${drive.id}/edit`)
    expect(link).toHaveAccessibleName(expect.stringContaining('2026-09-14'))
  })

  it('never shows time or speed', () => {
    const { container } = render(<DriveCard drive={drive} roadId={ROAD_ID} />)
    expect(container.textContent ?? '').not.toMatch(/速度|タイム|km\/h|時刻|\d{1,2}:\d{2}/)
  })
})
