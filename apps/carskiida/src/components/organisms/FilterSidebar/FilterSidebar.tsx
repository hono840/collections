import Link from 'next/link'
import { SectionHeading } from '@/components/atoms/SectionHeading'
import type { Facets } from '@/features/search/data'
import type { ParsedSearchParams } from '@/lib/validations/search'
import type { BodyType } from '@/types/car'

export interface FilterSidebarProps {
  facets: Facets
  params: ParsedSearchParams
}

/**
 * 絞り込みサイドバー（organism）。
 * URL 駆動の GET フォーム（JS不要・ブックマーク/共有可能）。
 * メーカー × ボディタイプ × ショーケースのみ × キーワード × 並び替え。
 */
export function FilterSidebar({ facets, params }: FilterSidebarProps) {
  return (
    <form
      method="get"
      action="/search"
      className="space-y-6 rounded-md border border-ck-border bg-ck-surface p-4"
    >
      <div>
        <label
          htmlFor="q"
          className="ck-num mb-1 block text-xs uppercase tracking-wide text-ck-text-muted"
        >
          キーワード
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={params.q}
          placeholder="車名・メーカー・別名"
          className="w-full rounded-sm border border-ck-border bg-ck-bg px-2 py-1.5 text-sm text-ck-text"
        />
      </div>

      <fieldset>
        <legend className="ck-num mb-2 text-xs uppercase tracking-wide text-ck-text-muted">
          メーカー
        </legend>
        <div className="space-y-1">
          {facets.makers.map((m) => (
            <label key={m.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="maker"
                value={m.value}
                defaultChecked={params.maker.includes(m.value)}
                className="accent-ck-accent"
              />
              <span className="text-ck-text">{m.label}</span>
              <span className="ck-num ml-auto text-xs text-ck-text-muted">
                {m.count}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="ck-num mb-2 text-xs uppercase tracking-wide text-ck-text-muted">
          ボディタイプ
        </legend>
        <div className="space-y-1">
          {facets.bodyTypes.map((b) => (
            <label key={b.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="body"
                value={b.value}
                defaultChecked={params.body.includes(b.value as BodyType)}
                className="accent-ck-accent"
              />
              <span className="text-ck-text">{b.label}</span>
              <span className="ck-num ml-auto text-xs text-ck-text-muted">
                {b.count}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="ck-num mb-2 text-xs uppercase tracking-wide text-ck-text-muted">
          生産国
        </legend>
        <div className="space-y-1">
          {facets.countries.map((c) => (
            <label key={c.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="country"
                value={c.value}
                defaultChecked={params.country.includes(c.value)}
                className="accent-ck-accent"
              />
              <span className="text-ck-text">{c.label}</span>
              <span className="ck-num ml-auto text-xs text-ck-text-muted">
                {c.count}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="showcaseOnly"
          value="1"
          defaultChecked={params.showcaseOnly}
          className="accent-ck-accent"
        />
        <span className="text-ck-text">ショーケースのみ</span>
      </label>

      <div>
        <label
          htmlFor="sort"
          className="ck-num mb-1 block text-xs uppercase tracking-wide text-ck-text-muted"
        >
          並び替え
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={params.sort}
          className="w-full rounded-sm border border-ck-border bg-ck-bg px-2 py-1.5 text-sm text-ck-text"
        >
          <option value="relevance">関連度</option>
          <option value="name">車名</option>
          <option value="maker">メーカー</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="ck-num rounded-sm border-2 border-ck-accent px-3 py-1.5 text-xs uppercase tracking-wide text-ck-accent transition-colors hover:bg-ck-accent/10"
        >
          絞り込む
        </button>
        <Link
          href="/search"
          className="ck-num text-xs uppercase tracking-wide text-ck-text-muted transition-colors hover:text-ck-mark"
        >
          リセット
        </Link>
      </div>
    </form>
  )
}
