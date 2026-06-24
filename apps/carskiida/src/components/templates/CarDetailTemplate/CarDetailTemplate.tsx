import Link from 'next/link'
import { CarModelHeader } from '@/components/organisms/CarModelHeader'
import { GenerationExplorer } from '@/components/organisms/GenerationExplorer'
import { LightDetail } from '@/components/organisms/LightDetail'
import { RelatedCars } from '@/components/organisms/RelatedCars'
import { SourceList } from '@/components/organisms/SourceList'
import { collectModelSources } from '@/features/cars/sources'
import type { CarModel, CarModelSummary } from '@/types/car'

export interface CarDetailTemplateProps {
  model: CarModel
  related?: CarModelSummary[]
  /** URL の ?gen= で指定された初期世代 ID */
  initialGenId?: string
}

/**
 * 車種詳細テンプレート。
 * depth(showcase) は世代エクスプローラー、breadth はライト詳細を描画する。
 * ブループリント方眼の上に「一枚の設計図」として配置する。
 */
export function CarDetailTemplate({
  model,
  related = [],
  initialGenId,
}: CarDetailTemplateProps) {
  const isShowcase = model.depthLevel === 'showcase'
  const sources = collectModelSources(model)

  return (
    <div className="ck-blueprint relative min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <nav className="mb-6">
          <Link
            href="/"
            className="ck-num text-xs uppercase tracking-wide text-ck-text-muted transition-colors hover:text-ck-accent"
          >
            ← carskiida 図鑑
          </Link>
        </nav>

        <CarModelHeader model={model} />

        <main className="mt-10">
          {isShowcase ? (
            <GenerationExplorer
              generations={model.generations}
              initialGenId={initialGenId}
            />
          ) : (
            <LightDetail model={model} />
          )}
        </main>

        {sources.length > 0 && (
          <div className="mt-16">
            <SourceList sources={sources} />
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-16">
            <RelatedCars models={related} />
          </div>
        )}

        <footer className="mt-16 border-t border-ck-border pt-6">
          <p className="text-xs leading-relaxed text-ck-text-muted">
            数値諸元はメーカー公式諸元・各種一次資料の事実値を転記し、各フィールドに出典を付与しています。
            出典はバッジから確認できます。データは順次拡充されます。
          </p>
        </footer>
      </div>
    </div>
  )
}
