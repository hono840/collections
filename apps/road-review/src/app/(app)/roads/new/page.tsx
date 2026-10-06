import type { Metadata } from 'next'
import { RoadForm } from '@/components/organisms/RoadForm'
import { FormPageTemplate } from '@/components/templates/FormPageTemplate'

export const metadata: Metadata = {
  title: '道を登録',
}

/** S-07 (US-02). */
export default async function NewRoadPage() {
  return <FormPageTemplate title="道を登録" form={<RoadForm mode="create" />} />
}
