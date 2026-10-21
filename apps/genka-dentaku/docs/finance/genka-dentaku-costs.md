# genka-dentaku（原価電卓）コスト見積もり — CFO成果物（参照）

正本はリポジトリルートの [`/docs/finance/genka-dentaku-costs.md`](../../../../docs/finance/genka-dentaku-costs.md) を参照（戦略セッション時にCFO → cost-analyzer / pricing-strategist のPDCAで作成）。

## 要点（アプリ開発視点の抜粋）

- **固定費 ~¥200/月**: Cloudflare Pages無料枠（商用利用可・帯域無制限）+ ドメイン償却。**Vercel Hobbyは商用禁止のため使用不可**（Payment Link設置=商用判定。使うならPro ¥3,240/月）→ **アプリは純静的エクスポート（`output: 'export'`）必須**
- **変動費**: Stripe 3.6%（買い切り）/ 4.3%（Billingサブスク）のみ。AI API不使用
- **価格**: Free（レシピ3件）/ Pro ¥980/月 or ¥9,800/年（Payment Link + ライセンスキー）
- **月30万円時P&L**: 純利益 ~¥286,900（純利益率 95.6%）
- **必須ページ**: 特定商取引法に基づく表記（有料販売の法的要件）
- **初期投資**: ~¥1,700（ドメイン初年のみ）
