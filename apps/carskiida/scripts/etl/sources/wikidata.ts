/**
 * Wikidata ソースクライアント（SPARQL）。CC0 / CC-BY-SA。帰属表記を継承すること。
 * docs: https://query.wikidata.org/
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

export async function sparql<T = Record<string, { value: string }>>(
  query: string
): Promise<T[]> {
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      accept: 'application/sparql-results+json',
      // Wikidata は User-Agent を要求する
      'user-agent': 'carskiida-etl/0.1 (https://carskiida.app; contact via repo)',
    },
  })
  if (!res.ok) {
    throw new Error(`Wikidata SPARQL failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as {
    results: { bindings: T[] }
  }
  return json.results.bindings
}

/** SPARQL 文字列リテラルのエスケープ（インジェクション対策） */
export function escapeSparqlString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\n\r\t]/g, ' ')
}

/**
 * 例: 自動車モデルの世代・生産国を引くクエリ（拡張用テンプレート）。
 * P31 = instance of, Q3231690 = automobile model。
 * labelJa は外部データ由来になり得るため必ずエスケープして埋め込む。
 */
export function modelQuery(labelJa: string): string {
  const label = escapeSparqlString(labelJa)
  return `
    SELECT ?model ?modelLabel ?countryLabel WHERE {
      ?model wdt:P31/wdt:P279* wd:Q3231690 .
      ?model rdfs:label "${label}"@ja .
      OPTIONAL { ?model wdt:P495 ?country . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
    } LIMIT 5
  `
}

export const WIKIDATA_SOURCE = {
  type: 'wikidata' as const,
  label: 'Wikidata',
  baseUrl: 'https://www.wikidata.org/',
  license: 'CC0-1.0',
}
