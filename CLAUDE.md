# MyCellar — Claude Code 向けガイド

- このファイルは「重要事項・毎タスクで要る不変の要点＋地図」だけ。詳細は各参照先を確認してください。

## Tech Stack

- Next.js（App Router）/ TypeScript
- Prisma + PostgreSQL（Neon）
- Better Auth（Google OAuth）
- Tailwind CSS + shadcn/ui
- react-hook-form + zod / Recharts
- Deploy: Vercel ／ Package manager: pnpm（Node 22）

## Commands

- `pnpm install` – 依存関係のインストール
- `pnpm dev` – 開発サーバ
- `pnpm build` – 本番ビルド（型チェック含む）
- `pnpm lint` – ESLint
- `pnpm prisma migrate dev` – DB マイグレーション

## Project Structure

- `src/app/` – 画面（Server / Client Components）と Route Handlers（`app/api/.../route.ts`）
- `prisma/` – `schema.prisma` とマイグレーション
- `docs/` – 設計ドキュメント

## Principles

- **YAGNI**：着手中の Issue 要件だけを完全に満たす。Issue に明記されない範囲外（未指示のUI・過剰なバリデーション・将来機能）は実装しない。
- **アーキの鉄則**：読み取り（一覧・詳細）＝ Server Component が Prisma を直接呼ぶ／書き込み＝ Route Handler で明示実装（**zod による再検証＋認可（自分の `userId` のみ）**。クライアント側バリデーションは信用しない）／zod スキーマはフォームと Route Handler で**共有**する（`src/lib/schemas` 等。二重定義しない）／**Server Actions は使わない**。→ 理由は `docs/adr.md`

## References

| ファイル               | 内容                             |
| ---------------------- | -------------------------------- |
| `docs/requirements.md` | 要件概要（目的・スコープ・方針） |
| `docs/user-stories.md` | ユーザーストーリー＋受け入れ条件 |
| `docs/data-model.md`   | データモデル（ER・スキーマ下地） |
| `docs/adr.md`          | 意思決定記録（なぜその選択か）   |
| `docs/roadmap.md`      | ロードマップ＋マイルストーン     |
| `CONTRIBUTING.md`      | 開発フロー・コードスタイル・PR   |
