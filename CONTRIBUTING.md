# コントリビューションガイド

> 「人間と AI 共通の作業手順・規約（プロセス手順書）」。
> コードの体裁・品質は**ツールが自動で強制**する（ESLint / Prettier / TypeScript strict）ので、本書には**手順**と**ツール化できない約束**だけを書く。

## 前提ツール

- **Node.js**：v22 以上（`nvm` 推奨）
- **パッケージマネージャ**：**pnpm**（`corepack enable` で有効化）。`npm` / `yarn` は使わない（ロックファイル競合防止）。

## コードスタイル

### ツールが強制（設定するだけ）

| 目的     | ツール                                       | 補足                                                  |
| -------- | -------------------------------------------- | ----------------------------------------------------- |
| 整形     | Prettier（＋ `prettier-plugin-tailwindcss`） | 保存時に自動整形。Tailwind のクラス順も自動整列       |
| 静的解析 | ESLint（`eslint-config-next`）               | React / Next / アクセシビリティ（jsx-a11y）ルール込み |
| 競合回避 | `eslint-config-prettier`                     | 整形系ルールを ESLint 側で無効化し Prettier に委ねる  |
| 型       | TypeScript（strict）                         | `create-next-app` の strict をそのまま使う            |

- HTML/CSS 専用リンタ（markuplint / stylelint）は**使わない**（React/JSX ＋ Tailwind 構成では価値が薄い）。
- CSS は基本書かない（Tailwind のクラスで完結）。`globals.css` のみ例外で、整形は Prettier・品質は目視で十分。
- VS Code は保存時整形が有効（`.vscode/settings.json`）。推奨拡張は初回に「すべてインストール」。

### 実装スタイル（人・Claude Code 共通）

> **Claude Code もこのスタイルで実装・生成すること**（後から人が直す前提にしない）。

- **シンプルで意味論的な HTML**：過剰な `div` ラッパーのネストを避け、可能な限りシンプルで無駄のない構造にする。
- **最低限のスタイリング**：shadcn/ui と HTML 要素のデフォルトスタイルを最大限に活かす。マジックナンバーを避け、手動の独自 Tailwind クラスは必要最低限に抑え、保守性を優先する。
- **モバイルファースト**で組む。

## テスト方針

> テストの目的は「壊すのが怖くなくなる自信」。

- **仕様が固まった直後**に、その機能のテストを機能実装と同じ PR で書く（別 Issue に先送りしない）。
- まずは変わりにくい **中身（入力チェック・認可・保存結果）** を重視する。UI の細部は仕様が固まってから。
- **Testing Trophy** を採用（静的 → 単体 → 結合 → E2E）。各層の比重はコスト対効果とプロジェクトの状況で調整する（本プロジェクトは結合を厚く、E2E は主要導線のみ）。
- カバレッジの数値目標は追わない（数合わせのテストは書かない）。

| レベル         | 対象                                                    | ツール     | 時期       |
| -------------- | ------------------------------------------------------- | ---------- | ---------- |
| 静的           | ESLint / Prettier / TS strict（上記「コードスタイル」） | —          | 常時       |
| 単体           | zod スキーマ、集計・判定などの純ロジック                | Vitest     | 実装と併走 |
| 結合（最重要） | Route Handler：検証 → 認可（自分の `userId` のみ）→ DB  | Vitest     | 実装と併走 |
| E2E            | ログイン→登録→一覧→編集→削除→グラフ の主要導線 1 本     | Playwright | 第 4 週    |

> テストランナー（Vitest / Playwright）の導入は別 Issue。

## ブランチ運用（GitHub Flow）

- タスクと状態の源は **GitHub（Issues＋Projects）**。ローカルに状態ファイル（TODO 等）は作らない。
- **着手時**：対象 Issue の仕様・受け入れ条件を確認（`gh issue view <N>`）してからブランチを切る。
- `main`は常にデプロイ可能な状態に保つ。
- `main`に直pushは禁止。
- **GitHub Flow を厳格に**：Issue ごとにトピックブランチを切る。1 ブランチ＝1 Issue を基本とする。
- **命名**：`<prefix>/#<issue番号>/<title-kebab>`（`prefix` は `feature` / `fix` / `chore` / `refactor` など）。
  - 例：`feature/#12/bottle-crud`

## コミット

- **アトミック**：1 コミット＝1 論理変更（例：コンポーネントの新規作成と、それを既存ページへ組み込む処理は別々のコミットに分ける）。
- **Conventional Commits**：`<type>: <内容>` を 1 行インラインで簡潔に書く。
  - type：`feat` / `fix` / `chore` / `refactor` / `style` / `docs` / `test`
  - 例：`feat: ボトル登録フォームを追加`
- 関連 Issue は本文か末尾で参照する（例：`Closes #12`）。

## セットアップ

```bash
# 1. 依存をインストール
pnpm install

# 2. 環境変数（DB）：Vercel の Neon 統合から取得
pnpm dlx vercel link            # 初回のみ：Vercel プロジェクトに紐付け
pnpm dlx vercel env pull .env   # DATABASE_URL などを .env に書き出す

# 3. 環境変数（認証）：AUTH_ 系を .env に手動で追記（項目は .env.example 参照）

# 4. DB マイグレーション
pnpm prisma migrate dev

# 5. 開発サーバ起動
pnpm dev
```

## プルリクエスト

- PR 前に必ず通す：

```bash
pnpm lint    # ESLint
pnpm build   # 型エラー含めビルドが通るか
```

- PR は `gh pr create` で作成する。本文テンプレート（`.github/pull_request_template.md`）が自動適用されるので、Issue の受け入れ条件をコピーしてセルフチェックする。
