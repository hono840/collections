import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// /roads/[roadId]/edit (S-07 edit, US-09). getRoad(roadId) -> null => notFound();
// found => FormPageTemplate(title "道を編集") + <RoadForm mode="edit" roadId defaultValues />.

const mocks = vi.hoisted(() => ({
  getRoad: vi.fn(),
  roadFormSpy: vi.fn(),
  notFound: vi.fn(() => {
    throw Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  }),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, redirect: vi.fn() }))
vi.mock('@/features/roads/queries', () => ({ getRoad: mocks.getRoad, listRoadSummaries: vi.fn() }))
vi.mock('@/components/organisms/RoadForm', () => ({
  RoadForm: (props: Record<string, unknown>) => {
    mocks.roadFormSpy(props)
    return <div data-testid="road-form" />
  },
}))

import EditRoadPage from './page'

const ROAD_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
const road = {
  id: ROAD_ID,
  name: '碓氷峠',
  prefectureCode: 10,
  roadType: 'pass' as const,
  start: { lat: 36.35, lng: 138.7 },
  end: { lat: 36.4, lng: 138.65 },
  createdAt: '2026-10-07T03:00:00+00:00',
  updatedAt: '2026-10-07T03:00:00+00:00',
}

async function renderPage(roadId = ROAD_ID) {
  const element = await EditRoadPage({ params: Promise.resolve({ roadId }) })
  return render(element)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('/roads/[roadId]/edit page', () => {
  it('renders the h1 "道を編集" and the edit form pre-filled from the road', async () => {
    mocks.getRoad.mockResolvedValue(road)
    await renderPage()

    expect(mocks.getRoad).toHaveBeenCalledWith(ROAD_ID)
    expect(screen.getByRole('heading', { level: 1, name: '道を編集' })).toBeInTheDocument()
    expect(mocks.roadFormSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'edit',
        roadId: ROAD_ID,
        defaultValues: {
          name: '碓氷峠',
          prefectureCode: 10,
          roadType: 'pass',
          start: { lat: 36.35, lng: 138.7 },
          end: { lat: 36.4, lng: 138.65 },
        },
      }),
    )
  })

  it("calls notFound() for a missing / other user's road", async () => {
    mocks.getRoad.mockResolvedValue(null)
    await expect(renderPage()).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(mocks.roadFormSpy).not.toHaveBeenCalled()
  })
})
