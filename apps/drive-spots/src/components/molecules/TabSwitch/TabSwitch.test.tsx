import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Tab } from '@/lib/spots/types'
import { TabSwitch } from './TabSwitch'

const WANT_TAB_NAME = /^行きたい\s*\d+$/
const DONE_TAB_NAME = /^行った\s*\d+$/

function renderTabSwitch(activeTab: Tab, wantCount = 18, doneCount = 1) {
  const onTabChange = vi.fn()
  render(<TabSwitch activeTab={activeTab} wantCount={wantCount} doneCount={doneCount} onTabChange={onTabChange} />)
  return { onTabChange }
}

function getWantTab(): HTMLElement {
  return screen.getByRole('button', { name: WANT_TAB_NAME })
}

function getDoneTab(): HTMLElement {
  return screen.getByRole('button', { name: DONE_TAB_NAME })
}

describe('TabSwitch', () => {
  it('AC2: groups the two tabs under the name 一覧の切り替え, 行きたい first', () => {
    renderTabSwitch('want')

    const group = screen.getByRole('group', { name: '一覧の切り替え' })
    const tabs = within(group).getAllByRole('button')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toBe(getWantTab())
    expect(tabs[1]).toBe(getDoneTab())
  })

  it('AC2/AC18: both tabs are real <button type="button">s', () => {
    renderTabSwitch('want')

    for (const tab of [getWantTab(), getDoneTab()]) {
      expect(tab).toBeInstanceOf(HTMLButtonElement)
      expect(tab).toHaveAttribute('type', 'button')
    }
  })

  it('AC2: each tab name includes its count', () => {
    renderTabSwitch('want', 18, 1)

    expect(getWantTab()).toHaveAccessibleName(/^行きたい\s*18$/)
    expect(getDoneTab()).toHaveAccessibleName(/^行った\s*1$/)
  })

  it('AC2: shows zero counts', () => {
    renderTabSwitch('done', 0, 0)

    expect(getWantTab()).toHaveAccessibleName(/^行きたい\s*0$/)
    expect(getDoneTab()).toHaveAccessibleName(/^行った\s*0$/)
  })

  it('AC2: with 行きたい active, aria-pressed is "true" on 行きたい and "false" on 行った', () => {
    renderTabSwitch('want')

    expect(getWantTab()).toHaveAttribute('aria-pressed', 'true')
    expect(getDoneTab()).toHaveAttribute('aria-pressed', 'false')
  })

  it('AC2: with 行った active, aria-pressed is "false" on 行きたい and "true" on 行った', () => {
    renderTabSwitch('done')

    expect(getWantTab()).toHaveAttribute('aria-pressed', 'false')
    expect(getDoneTab()).toHaveAttribute('aria-pressed', 'true')
  })

  it("AC2: pressing 行った calls onTabChange('done')", async () => {
    const user = userEvent.setup()
    const { onTabChange } = renderTabSwitch('want')

    await user.click(getDoneTab())

    expect(onTabChange).toHaveBeenCalledTimes(1)
    expect(onTabChange).toHaveBeenCalledWith('done')
  })

  it("AC2: pressing 行きたい calls onTabChange('want')", async () => {
    const user = userEvent.setup()
    const { onTabChange } = renderTabSwitch('done')

    await user.click(getWantTab())

    expect(onTabChange).toHaveBeenCalledTimes(1)
    expect(onTabChange).toHaveBeenCalledWith('want')
  })

  it('AC2: the 行きたい and 行った selections use different colors', () => {
    const { unmount } = render(
      <TabSwitch activeTab="want" wantCount={1} doneCount={1} onTabChange={vi.fn()} />,
    )
    const wantSelectedClassName = getWantTab().className
    unmount()

    render(<TabSwitch activeTab="done" wantCount={1} doneCount={1} onTabChange={vi.fn()} />)

    expect(getDoneTab().className).not.toBe(wantSelectedClassName)
  })
})
