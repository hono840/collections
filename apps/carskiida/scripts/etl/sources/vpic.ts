/**
 * NHTSA vPIC ソースクライアント（public domain・無料・登録不要）。
 * 実用上 10-15 req/s で IP 一時ブロックされるため、呼び出しは控えめに。
 * docs: https://vpic.nhtsa.dot.gov/api/
 */

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

export interface VpicModel {
  Make_ID: number
  Make_Name: string
  Model_ID: number
  Model_Name: string
}

interface VpicResponse<T> {
  Count: number
  Message: string
  Results: T[]
}

async function getJson<T>(url: string): Promise<VpicResponse<T>> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`vPIC request failed: ${res.status} ${res.statusText} (${url})`)
  }
  return (await res.json()) as VpicResponse<T>
}

/** 指定メーカーの全モデルを取得する */
export async function getModelsForMake(make: string): Promise<VpicModel[]> {
  const url = `${BASE}/GetModelsForMake/${encodeURIComponent(make)}?format=json`
  const data = await getJson<VpicModel>(url)
  return data.Results ?? []
}

export const VPIC_SOURCE = {
  type: 'vpic' as const,
  label: 'NHTSA vPIC',
  baseUrl: BASE,
  license: 'public-domain',
}
