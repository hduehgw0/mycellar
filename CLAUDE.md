# MyCellar — Claude Code 向けガイド

- このファイルは「重要事項・毎タスクで要る不変の要点＋地図」だけ。詳細は各参照先を確認してください。

## Tech Stack

- **Next.js 16**（App Router・Turbopack 既定）/ **React 19** / TypeScript 5
- **Prisma 7** + PostgreSQL（Neon）
- Better Auth 1.6（Google OAuth）
- **Tailwind CSS v4**
- shadcn/ui
- react-hook-form + **zod 4**
- テスト：**Vitest 4**
- Deploy: Vercel ／ Package manager: pnpm（Node 22.12+）

## Commands

- `pnpm install` – 依存関係のインストール
- `pnpm dev` – 開発サーバ
- `pnpm lint` – ESLint
- `pnpm format` – Prettier で整形（差分確認は `pnpm format:check`）
- `pnpm typecheck` – 型チェック（`tsc --noEmit`）
- `pnpm test` – Vitest（単体・結合）※ `test:watch` は終了しないので使わない
- `pnpm build` – 本番ビルド（`prisma generate` 込み）。CI では実行せず Vercel が担う
- `pnpm shadcn add <name>` – UI 部品を `src/components/ui/` に追加
- `pnpm prisma migrate dev` – DB マイグレーション（クライアント再生成も走る）
- `pnpm prisma studio` – DB の中身を GUI で確認

## Project Structure

- `src/app/` – 画面（Server / Client Components）と Route Handlers（`app/api/.../route.ts`）
- `prisma/` – `schema.prisma` とマイグレーション
- `docs/` – 設計ドキュメント

## Principles

- **YAGNI**：着手中の Issue 要件だけを完全に満たす。Issue に明記されない範囲外（未指示のUI・過剰なバリデーション・将来機能）は実装しない。
- **スキーマは前提ではなく判断**：`schema.prisma` の現在の構造は、その時点の要件に対する判断にすぎない。実装前・実装中に要件と構造が噛み合わないと感じたら、構造に合わせて要件を削らず、**構造の側を疑って開発者に提示する**（自分の判断で変更はしない）。→ `docs/data-model.md`
- **アーキの鉄則**：読み取り（一覧・詳細）＝ Server Component が Prisma を直接呼ぶ／書き込み＝ Route Handler で明示実装（**zod による再検証＋認可（自分の `userId` のみ）**。クライアント側バリデーションは信用しない）／zod スキーマはフォームと Route Handler で**共有**する（`src/lib/schemas` 等。二重定義しない）／**Server Actions は使わない**。→ 理由は `docs/adr.md`

## References

| ファイル               | 内容                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/requirements.md` | 要件概要（目的・スコープ・方針）                                                                                                                              |
| `docs/data-model.md`   | データモデルに関するコンテクスト(メタデータ)                                                                                                                  |
| `docs/adr.md`          | 意思決定記録（なぜその選択か）                                                                                                                                |
| `docs/roadmap.md`      | ロードマップ＋マイルストーン                                                                                                                                  |
| `docs/ui-mockups/`     | MVP の UI モック 9 枚（＝「UI をモックに合わせる」の完了条件）。`assets/` はモックが使う SVG で**設計資料**（ここから import しない。実装時に `src/` へ移す） |
| `CONTRIBUTING.md`      | 開発フロー・コードスタイル・PR                                                                                                                                |
