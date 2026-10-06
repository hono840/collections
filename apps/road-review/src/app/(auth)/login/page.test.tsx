import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LoginFormProps } from '@/components/organisms/LoginForm/LoginForm'

const loginFormSpy = vi.fn()

vi.mock('@/components/organisms/LoginForm', () => ({
  LoginForm: (props: LoginFormProps) => {
    loginFormSpy(props)
    return <div data-testid="login-form" />
  },
}))

import LoginPage, { metadata } from './page'

type SearchParams = Record<string, string | string[] | undefined>

async function renderLoginPage(searchParams: SearchParams) {
  loginFormSpy.mockClear()
  const element = await LoginPage({ searchParams: Promise.resolve(searchParams) })
  render(element)
  return loginFormSpy.mock.calls.at(-1)?.[0] as LoginFormProps
}

describe('LoginPage (S-01)', () => {
  it('sets the page title metadata', () => {
    expect(metadata.title).toBe('ログイン')
  })

  it('renders the auth layout with title, description, policy footer and LoginForm', async () => {
    await renderLoginPage({})
    expect(screen.getByRole('heading', { level: 1, name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByText('メールアドレスにログイン用のメールを送ります。')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      '法律の範囲内で楽しむための記録帳です。速度やタイムは扱いません。',
    )
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('passes no next / initialError when searchParams are empty', async () => {
    const props = await renderLoginPage({})
    expect(props.next).toBeUndefined()
    expect(props.initialError).toBeUndefined()
  })

  it('passes `next` through to LoginForm', async () => {
    const props = await renderLoginPage({ next: '/roads/abc' })
    expect(props.next).toBe('/roads/abc')
  })

  it('uses the first value when `next` is repeated', async () => {
    const props = await renderLoginPage({ next: ['/first', '/second'] })
    expect(props.next).toBe('/first')
  })

  it('maps error=link_invalid to initialError="link_invalid"', async () => {
    const props = await renderLoginPage({ error: 'link_invalid' })
    expect(props.initialError).toBe('link_invalid')
  })

  it('maps the first repeated error value', async () => {
    const props = await renderLoginPage({ error: ['link_invalid', 'other'] })
    expect(props.initialError).toBe('link_invalid')
  })

  it('ignores unknown error values', async () => {
    const props = await renderLoginPage({ error: 'something_else' })
    expect(props.initialError).toBeUndefined()
  })
})
