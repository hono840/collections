import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// /roads/new (S-07, US-02). FormPageTemplate(title "道を登録") + <RoadForm mode="create" />.

const roadFormSpy = vi.hoisted(() => vi.fn())

vi.mock('@/components/organisms/RoadForm', () => ({
  RoadForm: (props: Record<string, unknown>) => {
    roadFormSpy(props)
    return <div data-testid="road-form" />
  },
}))

import NewRoadPage, { metadata } from './page'

describe('/roads/new page', () => {
  it('sets the page title', () => {
    expect(metadata.title).toBe('道を登録')
  })

  it('renders the h1 "道を登録" and the create form', async () => {
    render(await NewRoadPage())
    expect(screen.getByRole('heading', { level: 1, name: '道を登録' })).toBeInTheDocument()
    expect(screen.getByTestId('road-form')).toBeInTheDocument()
    expect(roadFormSpy).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'create' }))
  })
})
