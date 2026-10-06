import { redirect } from 'next/navigation'

// The road list is the home screen. Signed-out users are sent to /login by proxy.ts.
export default function HomePage() {
  redirect('/roads')
}
