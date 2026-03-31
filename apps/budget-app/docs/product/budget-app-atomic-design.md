# Budget App - Atomic Design アーキテクチャ設計書

## 概要

本ドキュメントは、現在の機能ベースのコンポーネントディレクトリ構造から Atomic Design（atoms, molecules, organisms, templates）への移行計画を定義する。コンポーネントの分類、ディレクトリ構成、命名規則、移行マッピングに関する正式なリファレンスとして機能する。

このパターンは Collection モノレポ内の今後の全アプリにおけるデフォルトとしても採用する。

---

## 1. Atomic Design の階層構造

| レイヤー      | 定義                                                                  | 具体例                                   |
| ------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| **Atoms**     | 最小のUIプリミティブ。ビジネスロジックを持たない。高い再利用性。       | Button, Input, Skeleton, Badge, Icon     |
| **Molecules** | 2〜3個の atoms を組み合わせて一つの機能単位を形成する。                | TransactionRow, CategoryIcon, IconPicker |
| **Organisms** | molecules/atoms で構成される複雑なUIセクション。ローカルstateを持てる。| TransactionList, BudgetForm, Sidebar     |
| **Templates** | ページレベルのレイアウト構成。データなしで organisms を配置する。      | DashboardTemplate, TransactionsTemplate  |

> **補足:** "Pages" レイヤーは意図的に省略している。Next.js App Router では `app/` 配下のルートファイル（page.tsx）がページレイヤーの役割を担い、データ取得と templates への受け渡しを行うため。

---

## 2. ディレクトリ構成規約

```
src/components/
  atoms/
    Button/
      Button.tsx
      Button.test.tsx
      index.ts
    Input/
      Input.tsx
      Input.test.tsx
      index.ts
    ...
  molecules/
    TransactionRow/
      TransactionRow.tsx
      TransactionRow.test.tsx
      index.ts
    ...
  organisms/
    TransactionList/
      TransactionList.tsx
      TransactionList.test.tsx
      index.ts
    ...
  templates/
    DashboardTemplate/
      DashboardTemplate.tsx
      DashboardTemplate.test.tsx
      index.ts
    ...
```

### 命名・構成ルール

- **PascalCase** でコンポーネントディレクトリとファイルを命名: `Button/Button.tsx`
- **テストはコンポーネントと同一ディレクトリに配置**: `Button/Button.test.tsx`
- **バレルエクスポート**: 各ディレクトリに `index.ts` を設置し、コンポーネントを再エクスポート
- コンポーネントフォルダ内に**サブディレクトリは作らない**（フラットに保つ）
- **1ディレクトリにつき1コンポーネント**（そのコンポーネント専用のヘルパーや hooks は同一ディレクトリに置いてよい）

### index.ts のパターン

```ts
// src/components/atoms/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

---

## 3. コンポーネント分類

### 3.1 Atoms（新規抽出 + 既存プリミティブ）

コードベース全体に散在するインラインJSXパターンから新たに抽出するコンポーネントと、既存のUIプリミティブ。

| コンポーネント  | 抽出元 / 備考                                                                        |
| --------------- | ------------------------------------------------------------------------------------ |
| **Button**      | 新規 - 繰り返し使われている `<button>` パターンを抽出（primary, secondary, icon-only, FAB バリアント） |
| **IconButton**  | 新規 - アイコンのみのボタンパターンを抽出（編集、削除、アーカイブ、ナビゲーション矢印）       |
| **Input**       | 新規 - 繰り返し使われている `<input>` パターンを抽出（text, number, date）                |
| **Select**      | 新規 - 繰り返し使われている `<select>` パターンを抽出（カテゴリ選択、ソート選択）           |
| **Badge**       | 新規 - DaysRemainingBadge 内部の span パターンを抽出                                     |
| **ProgressBar** | 新規 - CategoryBudgetItem のプログレスバーを抽出                                         |
| **Skeleton**    | 既存 - `ui/skeleton.tsx`                                                                 |
| **Dialog**      | 既存 - `ui/dialog.tsx`                                                                   |
| **Toast**       | 既存 - `ui/toast.tsx`（ToastProvider + useToast）                                        |
| **ColorSwatch** | 新規 - category-form-dialog のカラーピッカーボタンを抽出                                  |

### 3.2 Molecules

atoms を組み合わせて構成する。一つの概念的な単位を表す。

| コンポーネント            | 現在のパス                                                      | 備考                                                  |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| **CategoryIcon**          | `categories/category-icon.tsx`                                  | カラー付きアイコン表示。純粋な表示コンポーネント。     |
| **IconPicker**            | `categories/icon-picker.tsx`                                    | 選択可能なアイコングリッド。CategoryIcon を使用。      |
| **TransactionRow**        | `transactions/transaction-row.tsx`                              | 取引1件の表示行。                                      |
| **BudgetCategoryRow**     | `budgets/budget-category-row.tsx`                               | 予算カテゴリ1行分の入力行。                            |
| **CategoryBudgetItem**    | `dashboard/category-budget-item.tsx`                            | カテゴリ別予算の進捗表示。                             |
| **DaysRemainingBadge**    | `dashboard/days-remaining-badge.tsx`                            | 残日数を表示するバッジ。Badge atom を使用。            |
| **MonthNavigator**        | `dashboard/month-navigator.tsx` + `reports/month-navigator.tsx` | 月の前後移動コントロール（共有）。重複を統合する。     |
| **ThemeToggle**           | `layout/theme-toggle.tsx`                                       | ライト/ダーク/システム切り替え。                       |
| **TransactionPagination** | `transactions/transaction-pagination.tsx`                       | ページネーションコントロール。                         |

### 3.3 Organisms

複雑でステートフルなセクション。Server Actions の呼び出しやローカルstateの管理を行う場合がある。

| コンポーネント            | 現在のパス                                 | 備考                                                       |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| **TransactionList**       | `transactions/transaction-list.tsx`        | 日付ごとに取引をグループ化し、編集ダイアログのstateを管理。 |
| **TransactionFilters**    | `transactions/transaction-filters.tsx`     | 検索 + フィルターパネル。URL stateと連動。                  |
| **EditTransactionDialog** | `transactions/edit-transaction-dialog.tsx` | 取引の編集・削除用ダイアログ。                              |
| **QuickExpenseDialog**    | `transactions/quick-expense-dialog.tsx`    | クイック支出入力用ダイアログ。                              |
| **QuickExpenseFab**       | `transactions/quick-expense-fab.tsx`       | FAB + ダイアログの組み合わせ。                              |
| **BudgetForm**            | `budgets/budget-form.tsx`                  | 自動保存機能付きの予算編集フォーム。                        |
| **CategoryCard**          | `categories/category-card.tsx`             | 編集・アーカイブ操作付きのカテゴリ表示。                    |
| **CategoryFormDialog**    | `categories/category-form-dialog.tsx`      | カテゴリの作成・編集ダイアログ。                            |
| **CategoryList**          | `categories/category-list.tsx`             | 作成ボタンとダイアログ付きのカテゴリグリッド。              |
| **CategoryBudgetList**    | `dashboard/category-budget-list.tsx`       | CategoryBudgetItem のリスト表示。                           |
| **RecentTransactions**    | `dashboard/recent-transactions.tsx`        | 直近の取引セクション（編集ダイアログ付き）。                |
| **MonthlySummaryCard**    | `dashboard/monthly-summary-card.tsx`       | 支出サマリーを表示するヒーローカード。                      |
| **MonthlyBarChart**       | `reports/monthly-bar-chart.tsx`            | Recharts による月別合計の棒グラフ。                         |
| **SpendingPieChart**      | `reports/spending-pie-chart.tsx`           | Recharts によるカテゴリ別内訳の円グラフ。                   |
| **Sidebar**               | `layout/sidebar.tsx`                       | デスクトップ用ナビゲーションサイドバー。                    |
| **BottomNav**             | `layout/bottom-nav.tsx`                    | モバイル用ボトムナビゲーション。                            |
| **Header**                | `layout/header.tsx`                        | ページタイトルヘッダー。                                    |
| **SettingsClient**        | `settings/settings-client.tsx`             | 設定ページのクライアントコンポーネント。                    |

### 3.4 Templates

ページレベルの構成。データを props として受け取り、organisms を配置する。

| コンポーネント           | 抽出元                                    | 備考                                                         |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| **DashboardTemplate**    | `app/(app)/dashboard/page.tsx`            | page.tsx からJSXレイアウトを抽出。サマリー/取引データを受け取る。 |
| **TransactionsTemplate** | `app/(app)/transactions/page.tsx`         | page.tsx からJSXレイアウトを抽出。フィルター済み取引データを受け取る。 |
| **BudgetsTemplate**      | `app/(app)/budgets/page.tsx`              | page.tsx からJSXレイアウトを抽出。                            |
| **CategoriesTemplate**   | `app/(app)/categories/page.tsx`           | page.tsx からJSXレイアウトを抽出。                            |
| **ReportsTemplate**      | `app/(app)/reports/page.tsx`              | page.tsx からJSXレイアウトを抽出。                            |
| **SettingsTemplate**     | `app/(app)/settings/page.tsx`             | page.tsx からJSXレイアウトを抽出。                            |
| **AppLayout**            | `app/(app)/layout.tsx`                    | 既存のレイアウト。templates パターンでラップする。            |

---

## 4. 移行マッピング（現在のパス → 新しいパス）

### 既存ファイル

| 現在のパス                                            | 新しいパス                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `components/ui/skeleton.tsx`                          | `components/atoms/Skeleton/Skeleton.tsx`                                       |
| `components/ui/dialog.tsx`                            | `components/atoms/Dialog/Dialog.tsx`                                           |
| `components/ui/toast.tsx`                             | `components/atoms/Toast/Toast.tsx`                                             |
| `components/categories/category-icon.tsx`             | `components/molecules/CategoryIcon/CategoryIcon.tsx`                           |
| `components/categories/icon-picker.tsx`               | `components/molecules/IconPicker/IconPicker.tsx`                               |
| `components/transactions/transaction-row.tsx`         | `components/molecules/TransactionRow/TransactionRow.tsx`                       |
| `components/budgets/budget-category-row.tsx`          | `components/molecules/BudgetCategoryRow/BudgetCategoryRow.tsx`                 |
| `components/dashboard/category-budget-item.tsx`       | `components/molecules/CategoryBudgetItem/CategoryBudgetItem.tsx`               |
| `components/dashboard/days-remaining-badge.tsx`       | `components/molecules/DaysRemainingBadge/DaysRemainingBadge.tsx`               |
| `components/dashboard/month-navigator.tsx`            | `components/molecules/MonthNavigator/MonthNavigator.tsx`                       |
| `components/reports/month-navigator.tsx`              | `components/molecules/MonthNavigator/MonthNavigator.tsx` に統合               |
| `components/layout/theme-toggle.tsx`                  | `components/molecules/ThemeToggle/ThemeToggle.tsx`                             |
| `components/transactions/transaction-pagination.tsx`  | `components/molecules/TransactionPagination/TransactionPagination.tsx`         |
| `components/transactions/transaction-list.tsx`        | `components/organisms/TransactionList/TransactionList.tsx`                     |
| `components/transactions/transaction-filters.tsx`     | `components/organisms/TransactionFilters/TransactionFilters.tsx`               |
| `components/transactions/edit-transaction-dialog.tsx` | `components/organisms/EditTransactionDialog/EditTransactionDialog.tsx`         |
| `components/transactions/quick-expense-dialog.tsx`    | `components/organisms/QuickExpenseDialog/QuickExpenseDialog.tsx`               |
| `components/transactions/quick-expense-fab.tsx`       | `components/organisms/QuickExpenseFab/QuickExpenseFab.tsx`                     |
| `components/budgets/budget-form.tsx`                  | `components/organisms/BudgetForm/BudgetForm.tsx`                               |
| `components/categories/category-card.tsx`             | `components/organisms/CategoryCard/CategoryCard.tsx`                           |
| `components/categories/category-form-dialog.tsx`      | `components/organisms/CategoryFormDialog/CategoryFormDialog.tsx`               |
| `components/categories/category-list.tsx`             | `components/organisms/CategoryList/CategoryList.tsx`                           |
| `components/dashboard/category-budget-list.tsx`       | `components/organisms/CategoryBudgetList/CategoryBudgetList.tsx`               |
| `components/dashboard/recent-transactions.tsx`        | `components/organisms/RecentTransactions/RecentTransactions.tsx`               |
| `components/dashboard/monthly-summary-card.tsx`       | `components/organisms/MonthlySummaryCard/MonthlySummaryCard.tsx`               |
| `components/reports/monthly-bar-chart.tsx`            | `components/organisms/MonthlyBarChart/MonthlyBarChart.tsx`                     |
| `components/reports/spending-pie-chart.tsx`           | `components/organisms/SpendingPieChart/SpendingPieChart.tsx`                   |
| `components/layout/sidebar.tsx`                       | `components/organisms/Sidebar/Sidebar.tsx`                                     |
| `components/layout/bottom-nav.tsx`                    | `components/organisms/BottomNav/BottomNav.tsx`                                 |
| `components/layout/header.tsx`                        | `components/organisms/Header/Header.tsx`                                       |
| `components/settings/settings-client.tsx`             | `components/organisms/SettingsClient/SettingsClient.tsx`                       |

### 新規抽出コンポーネント

| コンポーネント | レイヤー | 抽出元                                                        |
| -------------- | -------- | ------------------------------------------------------------- |
| Button         | atom     | 全コンポーネントに散在するインライン `<button>` パターン       |
| IconButton     | atom     | アイコンのみの `<button>` パターン（ナビ矢印、編集/削除アイコン） |
| Input          | atom     | フォーム内のインライン `<input>` パターン                      |
| Select         | atom     | フォーム内のインライン `<select>` パターン                     |
| Badge          | atom     | DaysRemainingBadge 内のステータスバッジパターン                |
| ProgressBar    | atom     | CategoryBudgetItem のプログレスバー                            |
| ColorSwatch    | atom     | CategoryFormDialog のカラーピッカーボタン                      |

### 新規 Templates

| コンポーネント       | レイヤー | 抽出元                                |
| -------------------- | -------- | ------------------------------------- |
| DashboardTemplate    | template | `app/(app)/dashboard/page.tsx` のJSX    |
| TransactionsTemplate | template | `app/(app)/transactions/page.tsx` のJSX |
| BudgetsTemplate      | template | `app/(app)/budgets/page.tsx` のJSX      |
| CategoriesTemplate   | template | `app/(app)/categories/page.tsx` のJSX   |
| ReportsTemplate      | template | `app/(app)/reports/page.tsx` のJSX      |
| SettingsTemplate     | template | `app/(app)/settings/page.tsx` のJSX     |

---

## 5. インポートパス戦略

### パスエイリアス

既存の `@/` エイリアスを継続使用する。インポートパスは以下のように変更される。

```ts
// 変更前
import { Dialog } from '@/components/ui/dialog';
import { TransactionRow } from '@/components/transactions/transaction-row';

// 変更後
import { Dialog } from '@/components/atoms/Dialog';
import { TransactionRow } from '@/components/molecules/TransactionRow';
```

### レイヤー単位のバレルエクスポート（任意、フェーズ2）

移行完了後、利便性向上のためレイヤーレベルのバレルファイル追加を検討する。

```ts
// src/components/atoms/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Dialog } from './Dialog';
// ...
```

これは任意であり、バンドラー設定で tree-shaking が正しく動作することを確認してから追加すべきである。

### インポートルール（依存方向の制約）

循環参照を防ぐため、以下の依存階層を遵守する。

```
atoms    <- molecules <- organisms <- templates
  |           |             |            |
  v           v             v            v
  lib/        lib/          lib/         lib/
  (utils,     (utils,       (utils,      (utils,
   hooks,      hooks,        hooks,       hooks,
   types)      types)        actions)     actions)
```

- **Atoms** は molecules, organisms, templates からインポートしてはならない
- **Molecules** は atoms からのみインポートできる
- **Organisms** は atoms と molecules からインポートできる
- **Templates** は atoms, molecules, organisms からインポートできる
- 全レイヤーは `lib/`（utils, hooks, types, actions）からインポートできる

---

## 6. MonthNavigator の重複排除

現在、`MonthNavigator` コンポーネントが2つ存在する。

- `components/dashboard/month-navigator.tsx` -- `useSearchParams` を使用し、props なしで `month` パラメータを直接読み取る
- `components/reports/month-navigator.tsx` -- `basePath`, `year`, `month` を props として受け取る

**計画:** 合理的なデフォルト値を持つ任意の props を受け取る単一の `MonthNavigator` molecule に統合する。

```ts
interface MonthNavigatorProps {
  /** ナビゲーションのベースパス（デフォルト: 現在のパス名） */
  basePath?: string;
  /** 年の上書き（デフォルト: URLの検索パラメータから読み取り） */
  year?: number;
  /** 月 1-12 の上書き（デフォルト: URLの検索パラメータから読み取り） */
  month?: number;
}
```

この統合コンポーネントは両方のユースケースに対応する。ダッシュボードではURLパラメータから自動的に読み取り、レポートでは明示的な値を渡せる。

---

## 7. 移行実行計画

### フェーズ1: 基盤構築（Atoms）

1. `atoms/` ディレクトリ構造を作成
2. 既存プリミティブを移動: Skeleton, Dialog, Toast
3. 新規 atoms を抽出: Button, IconButton, Input, Select, Badge, ProgressBar, ColorSwatch
4. 全 atoms のテストを作成
5. ファイル名を kebab-case から PascalCase にリネーム

### フェーズ2: Molecules

1. `molecules/` ディレクトリ構造を作成
2. 移動・リネーム: CategoryIcon, IconPicker, TransactionRow, BudgetCategoryRow, CategoryBudgetItem, DaysRemainingBadge, ThemeToggle, TransactionPagination
3. MonthNavigator を統合・移動
4. molecules 内のインポートを新しい atom パスに更新
5. molecules のテストを作成
6. molecules を抽出済み atoms を使うようリファクタリング（例: TransactionRow で Button を使用）

### フェーズ3: Organisms

1. `organisms/` ディレクトリ構造を作成
2. 全 organism コンポーネントを移動・リネーム
3. インポートを新しい atom/molecule パスに更新
4. organisms を抽出済み atoms を使うよう更新
5. organisms のテストを作成

### フェーズ4: Templates

1. `templates/` ディレクトリ構造を作成
2. page.tsx ファイルから template コンポーネントを抽出
3. page.tsx をシンプル化: データ取得 + template レンダリングのみに
4. templates のテストを作成

### フェーズ5: クリーンアップ

1. 旧 `components/` サブディレクトリを削除（ui/, layout/, dashboard/ 等）
2. 空の `auth/` ディレクトリを削除
3. 全インポートが更新されていることを確認（TypeScript コンパイラでエラーを検出）
4. テストスイートを全件実行
5. 依存方向の強制のため ESLint ルールまたはドキュメントを追加

---

## 8. ファイル数サマリー

| レイヤー  | 既存（移動）      | 新規（抽出）    | 合計   |
| --------- | ----------------- | --------------- | ------ |
| Atoms     | 3                 | 7               | 10     |
| Molecules | 9（統合後は8）    | 0               | 8      |
| Organisms | 19                | 0               | 19     |
| Templates | 0                 | 6               | 6      |
| **合計**  | **31**            | **13**          | **43** |

各コンポーネントディレクトリは3ファイル（コンポーネント、テスト、index）を含み、総ファイル数は約129となる。

---

## 9. CLAUDE.md / AGENTS.md 更新提案

### Collection レベルの CLAUDE.md への追記

「アプリ規約」セクションに以下を追加する。

```markdown
## コンポーネントアーキテクチャ（Atomic Design）

全アプリは Atomic Design パターンに従う:

- `components/atoms/` - UIプリミティブ（Button, Input, Dialog）。ビジネスロジックなし。
- `components/molecules/` - atoms の組み合わせ（TransactionRow, MonthNavigator）。
- `components/organisms/` - 複雑でステートフルなセクション（TransactionList, Sidebar）。
- `components/templates/` - データを props として受け取るページレイアウト。

### 規約

- PascalCase のディレクトリとファイル: `Button/Button.tsx`
- テストはコンポーネントと同一ディレクトリに配置: `Button/Button.test.tsx`
- バレルエクスポート: `Button/index.ts`
- 依存方向: atoms <- molecules <- organisms <- templates
```

### code-architect エージェントプロンプトへの追記

```markdown
## コンポーネント設計ルール

新しいコンポーネントを設計する際:

1. Atomic Design の階層構造に基づき atom/molecule/organism/template に分類する
2. 適切なレイヤーディレクトリに PascalCase で配置する
3. 依存方向の制約を遵守する（atoms は上位レイヤーからインポートしない）
4. index.ts のバレルエクスポートと .test.tsx ファイルを含める
5. molecules を作成する前に、繰り返し現れるUIパターンから再利用可能な atoms を抽出する
```

---

## 10. テスト戦略

### テストファイルの同一ディレクトリ配置パターン

```
ComponentName/
  ComponentName.tsx       # コンポーネント実装
  ComponentName.test.tsx  # ユニット/結合テスト
  index.ts               # バレルエクスポート
```

### レイヤー別テスト方針

| レイヤー  | テストの重点                                         | ツール       |
| --------- | ---------------------------------------------------- | ------------ |
| Atoms     | レンダリング、props、バリアント、アクセシビリティ     | Vitest + RTL |
| Molecules | コンポーネント結合の挙動、イベントハンドリング        | Vitest + RTL |
| Organisms | state管理、ユーザーインタラクション、Server Actions   | Vitest + RTL |
| Templates | レイアウト構成、条件付きレンダリング                  | Vitest + RTL |
| Pages     | E2E ユーザーフロー                                    | Playwright   |

---

## 付録: 意思決定ログ

| 決定事項                              | 根拠                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| 4レイヤー構成（"Pages" なし）          | Next.js App Router の page.tsx が既にページレイヤーの役割を果たしている        |
| PascalCase ディレクトリ               | React コンポーネントの命名慣習と一致し、視覚的に区別しやすい                  |
| テストの同一ディレクトリ配置           | コンテキストスイッチを減らし、コンポーネントを自己完結的にする                |
| MonthNavigator の統合                  | DRY原則に基づく。APIの差異が軽微なほぼ同一のコンポーネントが2つ存在している    |
| 新規 atom の抽出                       | 複数コンポーネントがボタン/入力パターンを重複して持ち、atoms 化で一貫性が向上  |
| page.tsx からの templates 抽出         | データ取得（page）とプレゼンテーション（template）の関心を分離する             |
| レイヤーバレルエクスポートはフェーズ1で不採用 | tree-shaking の問題を回避。検証後にのみ追加する                          |
