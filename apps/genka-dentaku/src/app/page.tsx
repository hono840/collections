/**
 * ランディング（プレースホルダ）。
 * STEP 1 の足場確認用。後続ステップで MarketingTemplate + MarketingHero に置き換える
 * （architecture §13 step 11）。H1 は原文固定（§8.1）。
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4">
      <h1 className="text-h1 font-bold text-ink">
        仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。
      </h1>
    </main>
  )
}
