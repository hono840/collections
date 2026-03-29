export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & App Name */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white font-bold text-xl shadow-lg">
            B
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Budget App
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            家計をスマートに管理
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl ring-1 ring-gray-900/5">
          {children}
        </div>
      </div>
    </div>
  )
}
