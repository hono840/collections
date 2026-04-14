---
paths:
  - "apps/**/components/**/*.tsx"
---

# コンポーネント設計ルール（Atomic Design）

UIコンポーネントは Atomic Design パターンに従う。

## 階層と依存方向

```
atoms ← molecules ← organisms ← templates
```

- **atoms** — 最小単位（Button, Input, Label, Icon, Badge）
- **molecules** — 複数atomsの組み合わせ（SearchBar, FormField）
- **organisms** — 独立セクション（Header, Sidebar, LoginForm）
- **templates** — ページレイアウト構造（データ含まない）

**逆方向の依存は禁止。** atomsがmoleculesに依存する等は不可。

## ディレクトリ規約

1コンポーネント = 1ディレクトリ:

```
ComponentName/
├── ComponentName.tsx      # コンポーネント本体
├── ComponentName.test.tsx # テスト（同居必須）
└── index.ts               # re-export
```

- コンポーネント名・ディレクトリ名は **PascalCase**
- テストは同じディレクトリに配置する
