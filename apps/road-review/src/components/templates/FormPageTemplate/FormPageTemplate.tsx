import type { ReactNode } from 'react'

export type FormPageTemplateProps = {
  title: string
  /** Notes shown above the form (e.g. the safety banner on the drive form). */
  notice?: ReactNode
  form: ReactNode
}

/** One-column form page (max 640px, centred): h1 title -> notice -> form. */
export function FormPageTemplate({ title, notice, form }: FormPageTemplateProps) {
  return (
    <section aria-labelledby="form-page-heading" className="mx-auto w-full max-w-160">
      <h1 id="form-page-heading" className="heading-mincho text-2xl text-ink">
        {title}
      </h1>
      {notice ? <div className="mt-4 space-y-2">{notice}</div> : null}
      <div className="mt-6">{form}</div>
    </section>
  )
}
