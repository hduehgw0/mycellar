# MyCellar データフロー — 値と型の遷移

> **この文書は現状把握のための読解ノートであり、仕様の正本ではない。**
> 仕様は `docs/requirements.md`、データモデルの文脈は `docs/data-model.md`、判断は `docs/adr.md` にある。
> ここが持つのは「ある値が、どのステップで、どの型・どの表現になっているか」だけ。
>
> 本文中の型・値・SQL は**すべて実測値**である。推測で書いた箇所には明示的にその旨を書いた。
> 実測の方法は「付録B 再現手順」を参照。
>
> **2026-09-08 時点のコードベースの記録であり、寿命は有限である。**
> #96 の点検から切り出されるリファクタがすべて終わった時点で、この文書は削除する。

---

## 目次

- [0. この文書の読み方](#0-この文書の読み方)
- [1. 登録フロー（POST /api/bottles）](#1-登録フローpost-apibottles)
- [2. 編集フロー（PATCH /api/bottles/[id]）](#2-編集フローpatch-apibottlesid)
- [3. 削除フロー（DELETE /api/bottles/[id]）](#3-削除フローdelete-apibottlesid)
- [4. 読み取りフロー（一覧・詳細・傾向）](#4-読み取りフロー一覧詳細傾向)
- [5. 横断論点① 「未入力」の六つの表現](#5-横断論点-未入力の六つの表現)
- [6. 横断論点② 型の系譜](#6-横断論点-型の系譜)
- [7. 横断論点③ 導出値 identityKey のライフサイクル](#7-横断論点-導出値-identitykey-のライフサイクル)
- [8. 型が保証していない三箇所](#8-型が保証していない三箇所)
- [付録A 実測ログ（抜粋）](#付録a-実測ログ抜粋)
- [付録B 再現手順](#付録b-再現手順)

---

## 0. この文書の読み方

### 0.1 三つの起点

「データフローの起点」は一つに決められない。編集フローが `DB の行 → フォーム → DB の行` という**閉じた環**になっているため、どこか一点を起点にすると必ず半分が説明の外に落ちる。そこで三層に分けて起点を置く。

| 層           | 起点                                          | 役割                                             |
| ------------ | --------------------------------------------- | ------------------------------------------------ |
| 型の正本     | `prisma/schema.prisma` → 生成型 `Bottle`      | 派生型（`Pick<Bottle, …>`）がすべてここから出る  |
| 契約の分水嶺 | `src/lib/schemas/bottle.ts` の `bottleSchema` | 入力型と出力型がここで分岐する                   |
| 追跡の基準   | ステップごとに選ぶ 1 フィールド               | 各節の冒頭で「このステップの主役」として明示する |

### 0.2 ステップの一覧

**登録（POST）— 12 ステップ**

```
[1] DOM の入力欄
[2] react-hook-form のフォーム状態          ← 型が BottleInput
[3] zodResolver の出力                     ← 型が BottleValues
[4] JSON.stringify → リクエスト本文          ★信頼境界／直列化境界
[5] await request.json()                  ← 型が any
[6] bottleSchema.safeParse の出力           ★認識境界
[7] createBottle（判定キー生成・userId 合流）
[8] 発行される INSERT
[9] DB の行                                ★意味論境界
[10] create の戻り値                        ← 型が Bottle
[11] 201 / 409 応答（JSON）
[12] クライアントの受け取り                    ← 型が any
```

**編集（PATCH）— 12 ステップ**。往路（`[E1] getOwnedBottle` → `[E2] defaultValues` の手写像）が加わり、`[E6] ?? null 正規化` が挿入される。登録との差分は第 2 章。

### 0.3 表の約束

各ステップに**全 13 カラムの表**を置く。存在しないカラムも行として残す。**どこで生まれ、どこで消えるかが、この文書のいちばんの内容**だからである。

- `«undefined»` / `«null»` — その値そのもの
- `«キー不在»` — オブジェクトにそのキーが存在しない（`undefined` とは別の状態）
- `«まだ無い»` — そのステップの時点でその概念がまだ存在しない
- `␟` — `IDENTITY_KEY_SEPARATOR`（U+001F, Unit Separator）

カラムの並びは「フォーム由来の 8 → サーバ由来の 2 → DB 由来の 3」で固定する。

### 0.4 実測環境

PostgreSQL 16.13 に `prisma/migrations/` の SQL 4 本をそのまま適用し、生成済み Prisma クライアント（7.8.0）と `src/lib/bottles.ts` をそのまま読み込んで観測した。フォーム側は jsdom 上で `react@19.2.4` / `react-hook-form@7.81.0` / `@hookform/resolvers@5.4.0` / `zod@4.4.3` を使い、`bottle-form.tsx` の登録方法を再現した。

---

## 1. 登録フロー（POST /api/bottles）

シナリオは「銘柄名に `yamazaki` とだけ入れて登録する」。任意項目には一切触らない。**このいちばん単純なケースが、いちばん多くの表現の変化を通る。**

---

### ステップ 1 — DOM の入力欄

> **このステップの主役：`age`**
> 理由：`<input type="number">` はブラウザが値を検査するため、**非数値を打つと DOM 上の値が空文字になる**。「abc」と入力しても検証エラーは出ず、静かに未入力（NAS）になる。この挙動はここでしか起きない。

`(focus)/bottles/new/page.tsx` は `await requireSession()` だけを行い、フォーム本体はクライアントコンポーネント `CreateBottleForm` → `BottleForm` に委ねる。

このステップにはまだ「型」が無い。あるのは DOM ノードの `value` / `checked` だけで、すべて文字列か真偽値である。

| カラム        | DOM 上の表現                    | このステップでの値 | 備考                                                                                                                                              |
| ------------- | ------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `<Input>`（Controller 経由）    | `"yamazaki"`       | `id`/`name` を `bottle-name` にしてある。Chrome が氏名欄と誤認して住所サジェストを出すため、`autoComplete="off"` では足りず属性名側で回避している |
| `region`      | Radix `<Select>`                | `"__none__"`       | Radix の `SelectItem` は空文字値を禁じるため、「未選択」にダミー値（`NONE`）を割り当てている                                                      |
| `subRegion`   | `<Input>`（Controller 経由）    | `""`               | `value={field.value ?? ""}` で制御。`null` を DOM に渡せないため                                                                                  |
| `age`         | `<input type="number" min={1}>` | `""`               | **非数値を打っても `""` になる**                                                                                                                  |
| `caskType`    | `<Input {...register}>`         | `""`               |                                                                                                                                                   |
| `isLimited`   | Radix `<Switch>`                | `false`            | `checked` 属性。文字列ではない                                                                                                                    |
| `quantity`    | **入力欄が無い**                | `1`                | `<output>` で表示し、`<Button>` で増減する。DOM 上に値を持つ入力欄は存在しない                                                                    |
| `note`        | `<Textarea>`                    | `""`               |                                                                                                                                                   |
| `userId`      | —                               | `«まだ無い»`       |                                                                                                                                                   |
| `identityKey` | —                               | `«まだ無い»`       |                                                                                                                                                   |
| `id`          | —                               | `«まだ無い»`       |                                                                                                                                                   |
| `createdAt`   | —                               | `«まだ無い»`       |                                                                                                                                                   |
| `updatedAt`   | —                               | `«まだ無い»`       |                                                                                                                                                   |

**このステップで押さえること**：未入力を表す表現は、テキスト系が `""`、`quantity` が `1`、`region` が `"__none__"`。三者三様であり、まだ `null` も `undefined` も登場していない。

---

### ステップ 2 — react-hook-form のフォーム状態（`BottleInput`）

> **このステップの主役：`region`**
> 理由：DOM のセンチネル `"__none__"` が、`onValueChange` の中で `null` に正規化される。**「未選択」を表す値が変わる唯一の場所**であり、しかも後述するとおり「一度も触らない」場合と「選んで戻した」場合とで残る値が違う。

型は `BottleInput = z.input<typeof bottleSchema>`。`useForm<BottleInput, unknown, BottleValues>` の第 1 型引数がこれにあたる。

`CreateBottleForm` が渡す `defaultValues` は次のとおりで、**`region` と `age` のキーが書かれていない**。

```ts
{ name: "", subRegion: "", caskType: "", isLimited: false, quantity: 1, note: "" }
```

ところが実測すると、フォーム状態のキーは 8 個ある。

```
キー順: ["name","subRegion","caskType","isLimited","quantity","note","age","region"]
値:     { name:"yamazaki", subRegion:"", caskType:"", isLimited:false,
          quantity:1, note:"", age:«undefined», region:«undefined» }
```

**`age` と `region` のキーは、`register` / `Controller` が呼ばれた時点で後から生えている。**「`defaultValues` にキーを書かないこと ＝ `undefined`」というコード中のコメントは、値としては正しいが、**キーは実際には存在する**。この差はステップ 4 で効いてくる。

| カラム                           | 型（`BottleInput`）                          | このステップでの値 | 備考                                                                   |
| -------------------------------- | -------------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `name`                           | `string`                                     | `"yamazaki"`       |                                                                        |
| `region`                         | `"スコットランド" \| … \| null \| undefined` | `«undefined»`      | キーは存在する。産地を選んで「未選択」に戻すと `«null»` になる（下記） |
| `subRegion`                      | `string \| null \| undefined`                | `""`               |                                                                        |
| `age`                            | `number \| null \| undefined`                | `«undefined»`      | `setValueAs: asOptionalNumber` が `""`/`null` を `undefined` に変換    |
| `caskType`                       | `string \| null \| undefined`                | `""`               |                                                                        |
| `isLimited`                      | `boolean \| undefined`                       | `false`            | `.default()` があるため入力側では optional                             |
| `quantity`                       | `number \| undefined`                        | `1`                | 同上                                                                   |
| `note`                           | `string \| null \| undefined`                | `""`               |                                                                        |
| `userId`                         | —                                            | `«まだ無い»`       |                                                                        |
| `identityKey`                    | —                                            | `«まだ無い»`       |                                                                        |
| `id` / `createdAt` / `updatedAt` | —                                            | `«まだ無い»`       |                                                                        |

#### `region` の分岐（実測）

同じ「産地が未設定」でも、操作の履歴によって値が違う。

| 操作                      | フォーム状態の `region` | 検証後        | 送られる JSON                                                      |
| ------------------------- | ----------------------- | ------------- | ------------------------------------------------------------------ |
| 一度も触らない            | `«undefined»`           | `«undefined»` | `{"name":"yamazaki","isLimited":false,"quantity":1}`               |
| 日本を選ぶ → 未選択に戻す | `«null»`                | `«null»`      | `{"name":"yamazaki","region":null,"isLimited":false,"quantity":1}` |
| 日本を選ぶ                | `"日本"`                | `"日本"`      | `{…,"region":"日本",…}`                                            |

**同じ画面状態（産地が「未選択」と表示されている）から、二通りのリクエストが出る。** 最終的に DB の列はどちらも `NULL` になるので実害は無いが、発行される SQL は違う（ステップ 8 参照）。

#### `age` の `setValueAs`（実測）

| 入力欄への操作     | DOM の値               | `setValueAs` 適用後                           |
| ------------------ | ---------------------- | --------------------------------------------- |
| 触らない           | `""`                   | `«undefined»`                                 |
| `12` を入力        | `"12"`                 | `12`                                          |
| `12` を入力 → 消す | `""`                   | `«undefined»`                                 |
| `abc` を入力       | `""`（ブラウザが弾く） | `«undefined»`                                 |
| `0` を入力         | `"0"`                  | `0` → **ステップ 3 で検証エラー**（`min(1)`） |

**`register("age")` に `setValueAs` が要る理由**はステップ 3 で明確になる。`z.number()` は文字列を数値に変換しないため、`"12"` を渡すと `invalid_type` で弾かれる（実測）。DOM は常に文字列を返すので、変換を挟まないとすべての年数入力が失敗する。

---

### ステップ 3 — zodResolver の出力（`BottleValues`）

> **このステップの主役：`caskType`**
> 理由：`optionalKeyText` は `trim` → `refine`（区切り文字の禁止） → `transform`（`""` → `undefined`） → `.nullish()` の 4 段を通る。**変換と検証の両方が乗る唯一の項目**であり、このステップで起きることの全部がここに現れる。

`bottleSchema` は 3 種類の部品からできている。

```ts
// 任意テキスト：空文字を「未入力」として undefined に潰す
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .nullish();

// 判定キーに入る任意テキスト：上に加えて区切り文字を禁止する
const optionalKeyText = z
  .string()
  .trim()
  .refine(
    (v) => !v.includes(IDENTITY_KEY_SEPARATOR),
    "使用できない文字が含まれています",
  )
  .transform((v) => (v === "" ? undefined : v))
  .nullish();
```

`name` だけは `transform` を持たず、代わりに `refine` を 2 段持つ。**正規化して空になる名前**（不可視文字だけの入力）を弾くためで、`trim` と `min(1)` はこれを通してしまう。

型は `BottleValues = z.output<typeof bottleSchema>`。`BottleInput` との差は `.default()` を持つ 2 項目だけで、**`isLimited` と `quantity` が optional でなくなる**。

| カラム                           | 型（`BottleValues`）          | このステップでの値 | 変換の内容                                        |
| -------------------------------- | ----------------------------- | ------------------ | ------------------------------------------------- |
| `name`                           | `string`                      | `"yamazaki"`       | `trim` のみ。**正規化はしない**（原文を保存する） |
| `region`                         | `enum \| null \| undefined`   | `«undefined»`      | 変換なし。`z.enum(REGIONS).nullish()`             |
| `subRegion`                      | `string \| null \| undefined` | `«undefined»`      | `""` → `undefined`                                |
| `age`                            | `number \| null \| undefined` | `«undefined»`      | 変換なし。`int().min(1)` の検証のみ               |
| `caskType`                       | `string \| null \| undefined` | `«undefined»`      | 区切り文字を検査 → `""` → `undefined`             |
| `isLimited`                      | **`boolean`**                 | `false`            | `.default(false)` で必須化                        |
| `quantity`                       | **`number`**                  | `1`                | `.default(1)` で必須化                            |
| `note`                           | `string \| null \| undefined` | `«undefined»`      | `""` → `undefined`                                |
| `userId`                         | —                             | `«まだ無い»`       | **本文に混ぜても消える**（下記）                  |
| `identityKey`                    | —                             | `«まだ無い»`       | 同上                                              |
| `id` / `createdAt` / `updatedAt` | —                             | `«まだ無い»`       |                                                   |

**キーは全部残る。** 実測した検証後のオブジェクトは 8 キーを持ち、値だけが `undefined` になっている。

```
検証後のキー: ["name","region","subRegion","age","caskType","isLimited","quantity","note"]
```

キーの順序が `bottleSchema` の定義順に並び替わっていることにも注目したい。zod は入力オブジェクトを書き換えるのではなく、**新しいオブジェクトを組み立てて返している**。

#### 未知のキーは黙って落ちる（実測）

```ts
bottleSchema.parse({ name: "yamazaki", userId: "attacker", identityKey: "x" });
// → キーは ["name","isLimited","quantity"] のみ
```

zod のオブジェクトスキーマは既定で未知のキーを strip する。この挙動が、**誰も明示していない一段目の防御**になっている。`createBottle` の `data: { ...input, identityKey, userId }` はスプレッドの後に `userId` を置くことで上書きを保証しているが、そもそもここまで到達しない。

---

### ステップ 4 — `JSON.stringify` → リクエスト本文 ★信頼境界／直列化境界

> **このステップの主役：`subRegion` / `note`**
> 理由：**値が変わるのではなく、キーごと消滅する**。この文書でここだけが「存在の消滅」を扱う。

`CreateBottleForm` は検証済みの `data` をそのまま送る。

```ts
const response = await fetch("/api/bottles", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

`JSON.stringify` はオブジェクトのプロパティ値が `undefined` のとき、**そのキーを出力しない**。JSON にそもそも `undefined` に相当する値が存在しないためで、回避方法は無い。

```
{"name":"yamazaki","isLimited":false,"quantity":1}
```

8 キーあったオブジェクトが 3 キーになった。

| カラム                           | ワイヤ上の表現 | 値           | 備考                                  |
| -------------------------------- | -------------- | ------------ | ------------------------------------- |
| `name`                           | JSON string    | `"yamazaki"` |                                       |
| `region`                         | —              | `«キー不在»` | `undefined` だったため消えた          |
| `subRegion`                      | —              | `«キー不在»` |                                       |
| `age`                            | —              | `«キー不在»` |                                       |
| `caskType`                       | —              | `«キー不在»` |                                       |
| `isLimited`                      | JSON boolean   | `false`      |                                       |
| `quantity`                       | JSON number    | `1`          |                                       |
| `note`                           | —              | `«キー不在»` |                                       |
| `userId`                         | —              | `«まだ無い»` | 送らない。送ってもステップ 6 で落ちる |
| `identityKey`                    | —              | `«まだ無い»` |                                       |
| `id` / `createdAt` / `updatedAt` | —              | `«まだ無い»` |                                       |

**この一点が、編集フローで `?? null` が必要になる根本の理由である。** PATCH で「この項目を空にしてほしい」と伝えたくても、`undefined` は物理的に送れない。[RFC 7396（JSON Merge Patch）](https://www.rfc-editor.org/rfc/rfc7396) が `null` に「削除」の意味を与えているのも同じ制約から来ている。

ここが**信頼境界**でもある。ここから先、本文は敵性の入力として扱われる。ブラウザを経由しないリクエストは任意の JSON を送れるため、ステップ 3 の検証結果は一切引き継がれない。

---

### ステップ 5 — `await request.json()`

> **このステップの主役：`userId`（そこに「無い」こと）**
> 理由：型が `any` に落ちる唯一のステップであり、同時に「所有者をここから取ってはいけない」という設計判断が効く場所。

```ts
const session = await getSession();
if (!session)
  return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

const body = await request.json().catch(() => null);
```

`Request#json()` の戻り値は `Promise<any>`。**型検査はここで完全に無効になる。** `.catch(() => null)` により、本文が JSON として壊れている場合は `null` になり、ステップ 6 の `safeParse` が失敗して 400 を返す。

| カラム       | 型    | このステップでの値                               | 備考                                                                       |
| ------------ | ----- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| （全カラム） | `any` | `{name:"yamazaki", isLimited:false, quantity:1}` | 個別の型は存在しない                                                       |
| `userId`     | `any` | `«キー不在»`                                     | **仮に攻撃者が送ってきても、ステップ 6 とステップ 7 の二段で無効化される** |

認証（ログインしているか）はこのステップで終わる。認可（その資源が本人のものか）はステップ 7 以降で `where` に `userId` を含めることで担われる。

---

### ステップ 6 — `bottleSchema.safeParse` の出力 ★認識境界

> **このステップの主役：`subRegion`**
> 理由：ステップ 3 とまったく同じスキーマ・同じ型を通るのに、**結果のキーの有無が違う**。同じ関数が経路によって違う形を返す、という事実がここでしか観測できない。

```ts
const parsed = bottleSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: "入力内容に誤りがあります" },
    { status: 400 },
  );
}
```

クライアント側の検証は信用せず、**同じスキーマ**でサーバでも検証し直す。これが `CLAUDE.md` の「zod スキーマはフォームと Route Handler で共有する」の実体であり、LANGSEC でいう Recognizer パターン（処理の前に完全に認識する）にあたる。

実測した出力：

```
parse 後のキー: ["name","isLimited","quantity"]
```

**ステップ 3 では 8 キーあったが、ここでは 3 キーしかない。** ステップ 4 でキーが消えたためで、`.nullish()` を持つ項目は「キーが無ければ何も生やさない」。型はどちらも `BottleValues` で同じだが、**実物の形が違う**。

| カラム                           | 型（`BottleValues`）          | このステップでの値 | ステップ 3 との違い                       |
| -------------------------------- | ----------------------------- | ------------------ | ----------------------------------------- |
| `name`                           | `string`                      | `"yamazaki"`       | 同じ                                      |
| `region`                         | `enum \| null \| undefined`   | `«キー不在»`       | ステップ 3 では `«undefined»`（キーあり） |
| `subRegion`                      | `string \| null \| undefined` | `«キー不在»`       | 同上                                      |
| `age`                            | `number \| null \| undefined` | `«キー不在»`       | 同上                                      |
| `caskType`                       | `string \| null \| undefined` | `«キー不在»`       | 同上                                      |
| `isLimited`                      | `boolean`                     | `false`            | 同じ                                      |
| `quantity`                       | `number`                      | `1`                | 同じ                                      |
| `note`                           | `string \| null \| undefined` | `«キー不在»`       | ステップ 3 では `«undefined»`             |
| `userId`                         | —                             | `«まだ無い»`       | 送られてきても strip される               |
| `identityKey`                    | —                             | `«まだ無い»`       | 同上                                      |
| `id` / `createdAt` / `updatedAt` | —                             | `«まだ無い»`       |                                           |

エラー時は 400 を返すが、**zod の issue の内容はクライアントに返さない**（一律 `"入力内容に誤りがあります"`）。フォーム側は既に同じスキーマで検証済みなので、ここに到達する 400 は UI 経由では起きえず、詳細を返す必要が無いという判断になっている。

---

### ステップ 7 — `createBottle`（判定キーの生成とセッションの合流）

> **このステップの主役：`identityKey`**
> 理由：**入力のどこにも存在しなかった値が、ここで生まれる。** 他のカラムと根本的に性質が違う（第 7 章）。

```ts
export async function createBottle(
  userId: string,
  input: BottleValues,
): Promise<CreateResult> {
  const identityKey = buildIdentityKey(input);
  try {
    const bottle = await prisma.bottle.create({
      data: { ...input, identityKey, userId }, // 所有者はボディではなくセッションから
    });
    return { status: "created", bottle };
  } catch (error) {
    /* P2002 → duplicate */
  }
}
```

#### `buildIdentityKey` の中身

```ts
[
  normalizeText(name),
  age == null ? "" : String(age),
  caskType == null ? "" : normalizeText(caskType),
  isLimited ? "1" : "0",
].join(IDENTITY_KEY_SEPARATOR); // U+001F
```

`normalizeText` は `NFKC → toLowerCase() → [\s\p{Cf}\p{Default_Ignorable_Code_Point}] の除去` を**この順で**固定している。順序が変われば結果が変わり、しかも結果は列に保存されて過去に固定されるため、順序の固定は必須である（[RFC 8264 PRECIS](https://www.rfc-editor.org/rfc/rfc8264.html) が国際化文字列の比較について操作順序を MUST NOT で規定しているのと同じ論点）。

`age == null` は緩い等価比較なので、**`null` と `undefined` とキー不在の三者がすべて `""` に潰れる**（実測で三者のキーが一致）。ここが「未入力の六つの表現」の最初の合流点になる。

| 入力                                         | 生成される判定キー                                        |
| -------------------------------------------- | --------------------------------------------------------- |
| `{name:"yamazaki"}`                          | `yamazaki␟␟␟0`                                            |
| `{name:"yamazaki", age:null, caskType:null}` | `yamazaki␟␟␟0`（同じ）                                    |
| `{name:"yamazaki", age:undefined}`           | `yamazaki␟␟␟0`（同じ）                                    |
| `{name:"Ｙａｍａｚａｋｉ"}`                  | `yamazaki␟␟␟0`（同じ）                                    |
| `{name:"  yamazaki  "}`                      | `yamazaki␟␟␟0`（同じ）                                    |
| `{name:"yamazaki", age:0}`                   | `yamazaki␟0␟␟0`（**別**。ただし `min(1)` により到達不能） |

`age: 0` を `""` にしなかったのは、「0 年」という入力と「年数なし」を区別するため。実際にはステップ 3 の `min(1)` が 0 を弾くので到達しないが、**判定キー側でも防御している**（コードのコメントどおり）。

#### このステップの全カラム

| カラム                    | 型                    | このステップでの値 | 備考                                                             |
| ------------------------- | --------------------- | ------------------ | ---------------------------------------------------------------- |
| `name` 〜 `note`          | `BottleValues` の各型 | ステップ 6 と同じ  | スプレッドでそのまま渡る                                         |
| `userId`                  | `string`              | `"u1"`             | **セッションから。スプレッドの後に置き、万一の混入を上書きする** |
| `identityKey`             | `string`              | `"yamazaki␟␟␟0"`   | ここで生まれる                                                   |
| `id`                      | —                     | `«まだ無い»`       | Prisma がステップ 8 で生成                                       |
| `createdAt` / `updatedAt` | —                     | `«まだ無い»`       | 同上                                                             |

渡っている `data` の型は `Prisma.BottleUncheckedCreateInput`（`userId` をスカラーで直接指定する形。リレーション経由の `BottleCreateInput` ではない）。

---

### ステップ 8 — 発行される INSERT

> **このステップの主役：`region` 〜 `note` の 5 列**
> 理由：**「キー不在／`undefined`」と「明示 `null`」の違いが、初めて目に見える形で現れる。** 結果は同じ NULL だが SQL が違う。

Prisma は `undefined` を「未指定」として扱い、**列リストから外す**。`null` は「NULL を書け」として列リストに載せる。実測した 3 パターン。

**(A) キー不在（今回の登録フロー）— 8 列**

```sql
INSERT INTO "public"."bottle"
  ("id","userId","name","isLimited","quantity","identityKey","createdAt","updatedAt")
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
RETURNING <13 列すべて>
-- params ["cmtfjg21g0000q07dlf2bt257","u1","yamazaki",false,1,
--         "yamazaki␟␟␟0","2026-08-30T08:19:12.340Z","2026-08-30T08:19:12.340Z"]
```

**(B) キーはあるが値が `undefined`（サーバ内で直接呼んだ場合）— (A) と完全に同一の SQL**

**(C) 明示 `null` — 13 列**

```sql
INSERT INTO "public"."bottle"
  ("id","userId","name","region","subRegion","age","caskType",
   "isLimited","quantity","note","identityKey","createdAt","updatedAt")
VALUES ($1,…,$13)
-- params [...,"yoichi",null,null,null,null,false,1,null,...]
```

**三つとも DB の列は SQL NULL になる。** (A)(B) は列に触らず DB の既定に委ね、(C) は明示的に NULL を書き込む。`region` 〜 `note` に DEFAULT は無いので、どちらも NULL になる。

#### `id` / `createdAt` / `updatedAt` は誰が作るか（実測）

| 列          | DB 側の DEFAULT     | 実際に値を作っているのは                                           |
| ----------- | ------------------- | ------------------------------------------------------------------ |
| `id`        | **無い**            | Prisma（cuid を生成。例 `cmtfjg21g0000q07dlf2bt257`）              |
| `createdAt` | `CURRENT_TIMESTAMP` | **Prisma**（DEFAULT があるのに使わず、列リストに載せて値を送る）   |
| `updatedAt` | **無い**            | Prisma                                                             |
| `isLimited` | `false`             | ステップ 3 の `.default(false)` が既に埋めているので、常に明示送信 |
| `quantity`  | `1`                 | 同上                                                               |

結果として `createdAt === updatedAt`（ミリ秒まで同一）で行が作られる。そして**タイムスタンプは DB の時計ではなくアプリケーションサーバの時計**である。Vercel の関数インスタンスの時刻が入る。

---

### ステップ 9 — DB の行 ★意味論境界

> **このステップの主役：`identityKey` の一意制約**
> 理由：ここが最後の砦であり、アプリ側の実行順序に依存しない唯一の保証。

実際の DDL（実測）：

```
   Column    |              Type              | Nullable |      Default
-------------+--------------------------------+----------+-------------------
 id          | text                           | not null |
 userId      | text                           | not null |
 name        | text                           | not null |
 region      | text                           |          |
 subRegion   | text                           |          |
 age         | integer                        |          |
 caskType    | text                           |          |
 isLimited   | boolean                        | not null | false
 quantity    | integer                        | not null | 1
 note        | text                           |          |
 createdAt   | timestamp(3) without time zone | not null | CURRENT_TIMESTAMP
 updatedAt   | timestamp(3) without time zone | not null |
 identityKey | text                           | not null |
Indexes:
    "bottle_pkey" PRIMARY KEY, btree (id)
    "bottle_userId_identityKey_key" UNIQUE, btree ("userId", "identityKey")
    "bottle_userId_idx" btree ("userId")
```

| カラム        | SQL 型         | NULL 可  | このステップでの値          |
| ------------- | -------------- | -------- | --------------------------- |
| `name`        | `text`         | 不可     | `yamazaki`                  |
| `region`      | `text`         | 可       | `NULL`                      |
| `subRegion`   | `text`         | 可       | `NULL`                      |
| `age`         | `integer`      | 可       | `NULL`                      |
| `caskType`    | `text`         | 可       | `NULL`                      |
| `isLimited`   | `boolean`      | 不可     | `false`                     |
| `quantity`    | `integer`      | 不可     | `1`                         |
| `note`        | `text`         | 可       | `NULL`                      |
| `userId`      | `text`         | 不可     | `u1`                        |
| `identityKey` | `text`         | **不可** | `yamazaki␟␟␟0`              |
| `id`          | `text`         | 不可     | `cmtfjg21g0000q07dlf2bt257` |
| `createdAt`   | `timestamp(3)` | 不可     | `2026-08-30 08:19:12.340`   |
| `updatedAt`   | `timestamp(3)` | 不可     | 同上                        |

`identityKey` が `NOT NULL` であることが本質的である。PostgreSQL は一意制約において NULL 同士を等しいと見なさないため、NULL を許す列に一意制約を張っても機能しない。**空欄を空文字に潰して NULL を消したのが `identityKey` の存在理由**である（ADR-0013）。この判断の妥当性は第 7 章で実測とともに検証する。

#### 重複が起きたとき（実測）

INSERT が一意制約に当たると、Prisma は `P2002` を投げる。その `meta` の中身：

```js
{
  modelName: "Bottle",
  driverAdapterError: { name: "DriverAdapterError", cause: {
    originalCode: "23505",
    originalMessage: 'duplicate key value violates unique constraint "bottle_userId_identityKey_key"',
    kind: "UniqueConstraintViolation",
    constraint: { fields: ['"userId"', '"identityKey"'] } } }
}
```

**衝突相手の行は入っていない。** 制約名と列名だけである（`fields` の各要素がダブルクォート込みの文字列である点も実測どおり）。だから `createBottle` は例外を捕まえたあと、判定キーで改めて `findUnique` を発行して衝突相手を取りに行く。

```ts
const existing = await findByIdentityKey(userId, identityKey);
```

「先に検索してから書く」順にしなかったのは、二重送信で両方が検索をすり抜けるため。**書き込んでから、失敗したら調べる**。これは DB を最後の砦として使う設計であり、アプリ側の実行順序に依存しない。

---

### ステップ 10 — `create` の戻り値（生成型 `Bottle`）

> **このステップの主役：`createdAt`**
> 理由：ここで初めて `Date` インスタンスが現れる。そしてステップ 11 で文字列に戻る。

`RETURNING` によって全 13 列が返り、Prisma が生成型 `Bottle` に組み立てる。

| カラム        | 型（`Bottle`）       | このステップでの値               | ステップ 6 からの変化                                          |
| ------------- | -------------------- | -------------------------------- | -------------------------------------------------------------- |
| `name`        | `string`             | `"yamazaki"`                     | —                                                              |
| `region`      | **`string \| null`** | `null`                           | **`enum` から `string` に格下げ**、`«キー不在»` から `null` へ |
| `subRegion`   | `string \| null`     | `null`                           | `«キー不在»` → `null`                                          |
| `age`         | `number \| null`     | `null`                           | 同上                                                           |
| `caskType`    | `string \| null`     | `null`                           | 同上                                                           |
| `isLimited`   | `boolean`            | `false`                          | —                                                              |
| `quantity`    | `number`             | `1`                              | —                                                              |
| `note`        | `string \| null`     | `null`                           | 同上                                                           |
| `userId`      | `string`             | `"u1"`                           | —                                                              |
| `identityKey` | `string`             | `"yamazaki␟␟␟0"`                 | —                                                              |
| `id`          | `string`             | `"cmtfjg21g…"`                   | 生まれた                                                       |
| `createdAt`   | **`Date`**           | `Date(2026-08-30T08:19:12.340Z)` | 生まれた                                                       |
| `updatedAt`   | **`Date`**           | 同上                             | 生まれた                                                       |

**このステップで `undefined` とキー不在が消滅する。** 未入力を表す表現は `null` の一種類だけになる。往路で 6 通りに分かれていたものが、ここで初めて一本化される。

同時に、**`region` の型がここで緩む**。zod では `"スコットランド" | "アイルランド" | …` という直和型だったものが、DB の列型に合わせて `string | null` になる。これが第 8 章で扱う「型が保証していない箇所」の一つ目。

---

### ステップ 11 — 応答（201 / 409）

> **このステップの主役：`createdAt`**
> 理由：`NextResponse.json` を通ると `Date` が ISO 文字列になる。**型は `Bottle` のままだが、実物は `Bottle` ではなくなる。**

```ts
// 201
return NextResponse.json(result.bottle, { status: 201 });

// 409
return NextResponse.json(
  { error: "同じボトルが既にあります", bottle: result.bottle },
  { status: 409 },
);
```

どちらも**行をまるごと返している**。実測した JSON 化後のキーは 13 個。

```
["id","userId","name","region","subRegion","age","caskType",
 "isLimited","quantity","note","identityKey","createdAt","updatedAt"]
```

| カラム                   | ワイヤ上の型     | 値                           | 備考                                  |
| ------------------------ | ---------------- | ---------------------------- | ------------------------------------- |
| `name`                   | string           | `"yamazaki"`                 |                                       |
| `region` 〜 `note`       | null             | `null`                       | `JSON.stringify` は `null` を消さない |
| `isLimited` / `quantity` | boolean / number | `false` / `1`                |                                       |
| `userId`                 | string           | `"u1"`                       | **クライアントに出ている**            |
| `identityKey`            | string           | `"yamazaki␟␟␟0"`             | **クライアントに出ている**            |
| `id`                     | string           | `"cmtfjg21g…"`               |                                       |
| `createdAt`              | **string**       | `"2026-08-30T08:19:12.340Z"` | **`Date` ではなくなった**             |
| `updatedAt`              | **string**       | 同上                         | 同上                                  |

`userId` と `identityKey` が応答に含まれている点は記録しておく価値がある。自分の行なので秘密ではなく、実害は無い。ただし Next.js 公式が推奨する「必要な分だけ返す」（Data Access Layer が最小の DTO を返す）からは外れており、行をそのまま返すという選択の帰結ではある。

---

### ステップ 12 — クライアントの受け取り

> **このステップの主役：409 応答の `bottle`**
> 理由：`any` から `Pick<Bottle, …>` に代入されるが、検査は一切無い。**この文書で唯一「型が嘘をついている」場所。**

```ts
if (response.status === 409) {
  const { bottle } = await response.json(); // ← any
  showDuplicateBottleToast(bottle);
  return "duplicate";
}
if (!response.ok) return "failed";
router.push("/bottles");
return "ok";
```

`showDuplicateBottleToast` の引数の型は：

```ts
type ExistingBottle = Pick<
  Bottle,
  "id" | "name" | "age" | "caskType" | "isLimited"
>;
```

**必要な 5 列だけを取り出している点は正しい設計**である（トーストの表示に要るのはこの 5 つだけ）。問題は、代入元が `any` なので**この型が実行時に何も保証していない**こと。

実際に来ているオブジェクトは 13 キーを持ち、`createdAt` は `string` である。`Bottle` 型は `createdAt: Date` と宣言しているので、`Bottle` として扱うのは事実に反する。今回使っている 5 つのキーはすべて型どおりなので実害は無いが、**将来 `createdAt` を使おうとした瞬間に静かに壊れる**（`bottle.createdAt.getTime()` が実行時エラーになる）。

| カラム                          | 名目上の型                  | 実際に来ている型 | 使われているか |
| ------------------------------- | --------------------------- | ---------------- | -------------- |
| `id`                            | `string`                    | `string`         | ✓ リンク先     |
| `name`                          | `string`                    | `string`         | ✓ 表示         |
| `age`                           | `number \| null`            | `number \| null` | ✓ 表示         |
| `caskType`                      | `string \| null`            | `string \| null` | ✓ 表示         |
| `isLimited`                     | `boolean`                   | `boolean`        | ✓ バッジ       |
| `region` / `subRegion` / `note` | （`Pick` の外）             | 来ている         | —              |
| `userId` / `identityKey`        | （`Pick` の外）             | 来ている         | —              |
| `createdAt` / `updatedAt`       | `Date`（`Bottle` の宣言上） | **`string`**     | 使われていない |

登録成功時は `router.push("/bottles")` で一覧へ遷移する。

**ここに非対称がある。** 削除（`DeleteBottleDialog`）と編集（`EditBottleForm`）は `router.push` のあとに `router.refresh()` を呼んでいるが、**登録だけ呼んでいない**。削除側にはその理由を書いたコメントもある（「一覧は Server Component キャッシュのため、遷移＋refresh で削除を反映する」）。登録で不要なのか、書き忘れなのかは**コードからは読み取れない**。この文書ではブラウザ上での挙動を実測していないので、未確定として記録しておく。

---

## 2. 編集フロー（PATCH /api/bottles/[id]）

### 2.0 登録との違い

編集は登録と同じステップを通るが、**前に 2 ステップ、途中に 1 ステップ**が加わる。

```
[E1] getOwnedBottle → Bottle              ← 新規：DB から始まる
[E2] defaultValues への手写像               ← 新規：Bottle → BottleInput の変換
[E3] フォーム状態              （= ステップ 2）
[E4] zodResolver の出力        （= ステップ 3）
[E5] ?? null 正規化                        ← 新規：undefined を null へ「戻す」
[E6] JSON.stringify → 本文     （≠ ステップ 4：キーが消えない）
[E7] await request.json()      （= ステップ 5）
[E8] bottleUpdateSchema.safeParse          ← 別スキーマ
[E9] updateBottle（判定キー再生成）
[E10] 発行される UPDATE
[E11] {ok:true} 応答                       ← 行を返さない（登録と非対称）
[E12] router.push + router.refresh
```

**最大の違いは、未入力の表現が `null` に統一されて流れること。** 登録では `undefined` → キー不在で流れたものが、編集では `null` で流れる。両者は最終的に同じ SQL NULL に着くが、通る道が違う。

以下、DB の行が `{name:"hakushu", region:null, subRegion:null, age:null, caskType:null, isLimited:false, quantity:1, note:null}` である状態から編集を始めるものとする。

---

### ステップ E1 — `getOwnedBottle`

> **このステップの主役：`userId`**
> 理由：**`where` に `userId` を含めることが認可そのもの**であり、フローの起点がここで所有権と結びつく。

```ts
export function getOwnedBottle(id: string, userId: string) {
  return prisma.bottle.findFirst({ where: { id, userId } });
}
```

`(focus)/bottles/[id]/edit/page.tsx` は Server Component で、`requireSession()` → `getOwnedBottle` → `if (!bottle) notFound()` の順に進む。**他人の id を渡しても、存在しない id を渡しても、区別なく 404 になる**（存在の有無を漏らさない）。

型は `Bottle | null`。中身はステップ 10 と同じ。

---

### ステップ E2 — `defaultValues` への手写像

> **このステップの主役：`subRegion` と `age` の対比**
> 理由：**同じ「未設定」が、フィールドによって `""` になったり `undefined` になったりする。** しかも理由が違う。ここが編集フローで最も密度の高いステップである。

```ts
defaultValues={{
  name: bottle.name,
  region: (bottle.region as (typeof REGIONS)[number] | null) ?? undefined,
  subRegion: bottle.subRegion ?? "",
  age: bottle.age ?? undefined,
  caskType: bottle.caskType ?? "",
  isLimited: bottle.isLimited,
  quantity: bottle.quantity,
  note: bottle.note ?? "",
}}
```

| カラム                    | `Bottle` での値 | 写像                  | `BottleInput` での値 | なぜその変換か                                                                                                          |
| ------------------------- | --------------- | --------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `name`                    | `"hakushu"`     | そのまま              | `"hakushu"`          | `string` は非 null                                                                                                      |
| `region`                  | `null`          | `as` → `?? undefined` | `«undefined»`        | **`Select` は「未選択」を `NONE` センチネルで表すので、`null` を渡す必要が無い。`as` は型検査を黙らせるためだけのもの** |
| `subRegion`               | `null`          | `?? ""`               | `""`                 | **制御された `<input>` に `null` を渡せない**（React が uncontrolled 警告を出す）                                       |
| `age`                     | `null`          | `?? undefined`        | `«undefined»`        | `<input type="number">` に空を渡す表現が無い。`setValueAs` が `""` を `undefined` にするので、初期値もそれに合わせる    |
| `caskType`                | `null`          | `?? ""`               | `""`                 | `subRegion` と同じ理由                                                                                                  |
| `isLimited`               | `false`         | そのまま              | `false`              |                                                                                                                         |
| `quantity`                | `1`             | そのまま              | `1`                  |                                                                                                                         |
| `note`                    | `null`          | `?? ""`               | `""`                 | `subRegion` と同じ理由                                                                                                  |
| `userId`                  | `"u1"`          | **渡さない**          | `«まだ無い»`         | フォームに載せない＝改竄の余地を作らない                                                                                |
| `identityKey`             | `"hakushu␟␟␟0"` | **渡さない**          | `«まだ無い»`         | 導出値。毎回サーバで作り直す                                                                                            |
| `id`                      | `"cmtfj…"`      | props で別途          | —                    | `EditBottleForm` が `bottle.id` を送信先 URL に使う                                                                     |
| `createdAt` / `updatedAt` | `Date`          | 渡さない              | —                    |                                                                                                                         |

**テキスト系は `""`、数値と enum は `undefined`。** 一貫していないように見えるが、理由は明確で、**DOM 側に「空」を表現する手段があるかどうか**で分かれている。テキスト入力には空文字があるが、数値入力と Select には無い。

同時に、このステップは `Bottle`（13 列）から `BottleInput`（8 項目）への**情報の切り落とし**でもある。フォームには `userId` も `identityKey` も載らない。載せないことが安全である。

---

### ステップ E3・E4 — フォーム状態と検証（登録と同じ）

ステップ 2・ステップ 3 と同じ。実測（何も触らずに送信した場合）：

```
フォーム状態: { name:"hakushu", region:«undefined», subRegion:"", age:«undefined»,
               caskType:"", isLimited:false, quantity:1, note:"" }
検証後:      { name:"hakushu", region:«undefined», subRegion:«undefined», age:«undefined»,
               caskType:«undefined», isLimited:false, quantity:1, note:«undefined» }
```

**元の DB の値は `null` だったが、フォームを一往復すると `undefined` になる。** ここで何もしなければ、ステップ E6 の `JSON.stringify` でキーごと消え、`bottleUpdateSchema` の「全項目必須」に引っかかって 400 になる。それを防ぐのが次のステップである。

---

### ステップ E5 — `?? null` 正規化

> **このステップの主役：`region`**
> 理由：`?? null` は値の変換だけでなく、**存在しないキーを作る**働きもしている。それが最も顕著に出るのが `region`。

```ts
const payload = {
  ...data,
  region: data.region ?? null,
  subRegion: data.subRegion ?? null,
  age: data.age ?? null,
  caskType: data.caskType ?? null,
  note: data.note ?? null,
};
```

登録には無い処理である。目的は二つ。

1. **`undefined` を `null` に戻す。** ステップ 4 で見たとおり `undefined` は JSON に載らないため、このままでは「空にしてほしい」を伝えられない。
2. **キーを作る。** `data` に `region` キーが無い場合（登録デフォルトから来た場合など）、`data.region ?? null` は `region: null` という**新しいキーを生やす**。`bottleUpdateSchema` は全項目必須なので、これが無いと通らない。

| カラム                                                      | ステップ E4 での値 | `?? null` 後 | 効果                                            |
| ----------------------------------------------------------- | ------------------ | ------------ | ----------------------------------------------- |
| `name`                                                      | `"hakushu"`        | `"hakushu"`  | （対象外）                                      |
| `region`                                                    | `«undefined»`      | `null`       | 値の変換 ＋ キーの保証                          |
| `subRegion`                                                 | `«undefined»`      | `null`       | 同上                                            |
| `age`                                                       | `«undefined»`      | `null`       | 同上                                            |
| `caskType`                                                  | `«undefined»`      | `null`       | 同上                                            |
| `isLimited`                                                 | `false`            | `false`      | （対象外。`.default()` があるので必ず値がある） |
| `quantity`                                                  | `1`                | `1`          | （対象外）                                      |
| `note`                                                      | `«undefined»`      | `null`       | 値の変換 ＋ キーの保証                          |
| `userId` / `identityKey` / `id` / `createdAt` / `updatedAt` | `«まだ無い»`       | `«まだ無い»` |                                                 |

`isLimited` と `quantity` が対象外なのは、`.default()` によって検証後は必ず値を持つため。**`?? null` の対象は、ちょうど `.nullish()` を持つ 5 項目と一致する。**

---

### ステップ E6 — `JSON.stringify` → リクエスト本文

登録のステップ 4 と違い、**キーは一つも消えない**。`null` は JSON に存在する値だからである。

```json
{
  "name": "hakushu",
  "region": null,
  "subRegion": null,
  "age": null,
  "caskType": null,
  "isLimited": false,
  "quantity": 1,
  "note": null
}
```

8 キーがすべて残る。登録が 3 キーだったのと対照的である。

---

### ステップ E7 — `await request.json()`

登録のステップ 5 と同じ。`any`。`{ params }` から `id` を取り出すのはこの直後。

```ts
const { id } = await params; // Next.js 16 では params が Promise
```

`params` はユーザー入力である。`id` は検証していないが、`where: { id, userId }` に渡されるだけで、`findFirst` / `updateMany` は一致しなければ 0 件を返すため、無効な id は 404 になる。

---

### ステップ E8 — `bottleUpdateSchema.safeParse` ★認識境界

> **このステップの主役：`quantity`**
> 理由：`.required()` が `.default()` **まで剥がす**。これは実測しないと分からない挙動であり、`bottleUpdateSchema` の性格を決めている。

```ts
export const bottleUpdateSchema = bottleSchema.required();
```

`.required()` は各フィールドの `ZodOptional` を剥がす。`.nullish()` は `ZodOptional<ZodNullable<T>>` なので、剥がすと `ZodNullable<T>` が残る（`null` は許され、省略は許されない）。**そして `.default()` も剥がされる**（実測）。

実測した挙動：

| 送った本文                       | 結果     | issue                                      |
| -------------------------------- | -------- | ------------------------------------------ |
| 8 項目すべて（空欄は `null`）    | **通る** | —                                          |
| `quantity` と `isLimited` を省略 | **400**  | 両者に `invalid_type`                      |
| 任意 5 項目を省略                | **400**  | 5 項目すべてに `invalid_type`              |
| 空欄に `""` を送る               | **400**  | `expected nonoptional, received undefined` |

最後の行が興味深い。`optionalText` は `transform("" → undefined)` を持つため、`""` を送ると `undefined` になり、それが「省略された」と見なされて `nonoptional` 違反になる。**ADR-0011 が「空欄にするときは `null` を送る（空文字は弾く）」と書いた契約が、`.required()` の副作用として型構造に組み込まれている。** 意図と実装が一致しているが、実装上の因果は「そう書いたから」ではなく「`transform` と `.required()` の組み合わせがそうなるから」である。

| カラム                  | 型（`BottleUpdateValues`） | このステップでの値 | `BottleValues` との差            |
| ----------------------- | -------------------------- | ------------------ | -------------------------------- |
| `name`                  | `string`                   | `"hakushu"`        | 同じ                             |
| `region`                | `enum \| null`             | `null`             | **`undefined` が許されない**     |
| `subRegion`             | `string \| null`           | `null`             | 同上                             |
| `age`                   | `number \| null`           | `null`             | 同上                             |
| `caskType`              | `string \| null`           | `null`             | 同上                             |
| `isLimited`             | `boolean`                  | `false`            | **既定値が効かない（省略不可）** |
| `quantity`              | `number`                   | `3`                | 同上                             |
| `note`                  | `string \| null`           | `null`             | `undefined` が許されない         |
| `userId` 〜 `updatedAt` | —                          | `«まだ無い»`       | 同じく strip される              |

**なぜ部分更新を受け付けないのか。** ADR-0011 が書いているとおり、`identityKey` が `name`・`age`・`caskType`・`isLimited` の 4 項目から作られるためである。仮に `caskType` の送信を省略できるようにすると、`buildIdentityKey` は `undefined`（＝空）で計算してしまい、**保存される行と判定キーが食い違う**。通信量とのトレードオフではなく、整合性の要件である。

---

### ステップ E9 — `updateBottle`

> **このステップの主役：`identityKey`**
> 理由：更新のたびに**作り直される**。値が変わっていなくても書き直される。

```ts
const identityKey = buildIdentityKey(input);
const { count } = await prisma.bottle.updateMany({
  where: { id, userId }, // 認可：他人のボトルは更新できない
  data: { ...input, identityKey },
});
return count === 0 ? { status: "notFound" } : { status: "updated" };
```

`update` ではなく `updateMany` を使っているのは、**`update` の `where` が一意フィルタしか受け付けない**ため。`updateMany` なら `userId` を AND でき、しかも件数を返すので 404 判定に使える。所有権チェックと更新が 1 クエリで済み、その間に別のリクエストが割り込む余地が無い。

登録と編集で `buildIdentityKey` を共有していることが重要である。片方だけ計算式が変わると、**編集した瞬間に重複が素通りする**。`bottles.test.ts` の最後のテストがこれを守っている。

---

### ステップ E10 — 発行される UPDATE

> **このステップの主役：`updatedAt`**
> 理由：`updateMany` でも `@updatedAt` が効いている（実測）。`SET` に明示的に載る。

```sql
UPDATE "public"."bottle"
SET "name"=$1, "region"=$2, "subRegion"=$3, "age"=$4, "caskType"=$5,
    "isLimited"=$6, "quantity"=$7, "note"=$8, "identityKey"=$9, "updatedAt"=$10
WHERE ("public"."bottle"."id"=$11 AND "public"."bottle"."userId"=$12)
-- params ["hakushu",null,null,null,null,false,3,
--         "hakushu␟␟␟0","2026-08-30T08:19:12.433Z","cmtfjg21n…","u1"]
```

**10 列を SET する。** 入力の 8 項目に `identityKey` と `updatedAt` が加わる。`id`・`userId`・`createdAt` は触らない。

#### 他人の userId で更新を試みた場合（実測）

```sql
UPDATE ... WHERE ("id"=$11 AND "userId"=$12)   -- params [..., "u2_other"]
```

**UPDATE 文自体は発行される。** それが 0 行にマッチし、`count: 0` → `notFound` → 404 になる。「他人の行を読まないようにする」のではなく「クエリを空振りさせる」という設計である。削除も同じ形（第 3 章）。

---

### ステップ E11・E12 — 応答とクライアント

編集の成功応答は登録と非対称で、**行を返さない**。

```ts
return NextResponse.json({ ok: true });
```

クライアントは行を必要としない（詳細ページへ遷移して Server Component が読み直すため）。

```ts
router.push(`/bottles/${bottle.id}`);
router.refresh();
```

`router.refresh()` を明示的に呼んでいるのは、詳細ページが Server Component のキャッシュから復元されると古い値が見えるため。登録側が `refresh()` を呼んでいないのは、遷移先の一覧が別のルートで、`push` による遷移で再実行されるからである。

409（編集で別のボトルと同じ物になった場合）は登録とまったく同じ形で返り、同じトーストを出す。`dismissDuplicateBottleToast()` を送信前に呼んでいるのは、同じ ID のトーストを出し直すため（`sonner` の `id` で重複を防いでいる）。

---

## 3. 削除フロー（DELETE /api/bottles/[id]）

> **このフローの主役：`id` と `userId` の組**
> 理由：削除には本文が無いので、フローに登場する値はこの 2 つだけになる。

```ts
const { count } = await prisma.bottle.deleteMany({
  where: { id, userId: session.user.id },
});
if (count === 0)
  return NextResponse.json(
    { error: "ボトルが見つかりません" },
    { status: 404 },
  );
return NextResponse.json({ ok: true });
```

実測した SQL と結果：

```sql
DELETE FROM "public"."bottle" WHERE ("public"."bottle"."id"=$1 AND "public"."bottle"."userId"=$2)
```

| 実行者             | `count` | 応答        |
| ------------------ | ------- | ----------- |
| 他人（`u2_other`） | `0`     | 404         |
| 本人（`u1`）       | `1`     | `{ok:true}` |

`delete` ではなく `deleteMany` を使う理由は `updateMany` と同じ。`id` が一意なので一致は最大 1 件であり、所有権チェックと削除が 1 クエリでアトミックに済む。

クライアント側（`DeleteBottleDialog`）は、成功時に `isDeleting` を `false` に戻さない。遷移でアンマウントされるため戻す必要が無く、戻すと**遷移前の一瞬ボタンが再有効化されて二重 DELETE → 404 になる**。

なお `User` の削除時は `onDelete: Cascade` により Bottle も消えるが、アプリにアカウント削除機能は無いため、この経路は現状使われない。

---

## 4. 読み取りフロー（一覧・詳細・傾向）

読み取りは Route Handler を経由せず、**Server Component が Prisma を直接呼ぶ**（ADR-0002）。したがって信頼境界を越えるのは「サーバからクライアントへ渡すとき」だけになる。

### 4.1 一覧（`(sections)/bottles/page.tsx`）

```ts
const bottles = await prisma.bottle.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: "desc" },
});
const total = bottles.reduce((sum, b) => sum + b.quantity, 0);
```

実測した SQL は**全 13 列**を取る。

```sql
SELECT "id","userId","name","region","subRegion","age","caskType","isLimited",
       "quantity","note","identityKey","createdAt","updatedAt"
FROM "public"."bottle" WHERE "userId"=$1 ORDER BY "createdAt" DESC OFFSET $2
```

型は `Bottle[]`。**クライアントには渡らない。** このページはすべて Server Component で、`<Link>` に渡しているのは `bottle.id` から組み立てた文字列だけである。結果として、`userId` も `identityKey` もブラウザには届かない。Next.js 公式の「必要な分だけ渡す」を、意図せず満たしている形になっている。

`total` は `quantity` の合計であって行数ではない。**「銘柄数」と「本数」の区別**は第 4.3 節の `BottleStats` にも現れる。

### 4.2 詳細（`(focus)/bottles/[id]/page.tsx`）

`getOwnedBottle` で `Bottle | null` を取り、`null` なら `notFound()`。

このページで注目すべきは、クライアントコンポーネントへの渡し方である。

```tsx
<DeleteBottleDialog bottleId={bottle.id} bottleTitle={title} />
```

`bottle` オブジェクトを丸ごと渡さず、**`string` を 2 つだけ渡している**。これが実質的な DTO であり、この行だけで `userId` / `identityKey` / `note` などがクライアントに漏れることを防いでいる。

一方で表示の側には注意点がある。`details` 配列は未入力の任意項目も行として出すが、`note` については `<dd>{bottle.note}</dd>` としているため、**`null` のときは空の枠だけが残る**。値が無いときの表示は現状 UI 側で吸収していない。

### 4.3 傾向（`(sections)/stats/page.tsx`）— `Pick` 型と `satisfies`

> **この節の主役：`BottleForStats`**
> 理由：**`Bottle` 由来の型がスキーマの変更を検知する仕組み**が、ここにだけある。

```ts
export type BottleForStats = Pick<
  Bottle,
  "name" | "region" | "isLimited" | "quantity"
>;

const BOTTLE_STATS_SELECT = {
  name: true,
  region: true,
  isLimited: true,
  quantity: true,
} satisfies Record<keyof BottleForStats, true>;

const bottles = await prisma.bottle.findMany({
  where: { userId: session.user.id },
  select: BOTTLE_STATS_SELECT,
});
```

`satisfies Record<keyof BottleForStats, true>` は、**`BOTTLE_STATS_SELECT` と `BottleForStats` の過不足を型エラーとして検出する**。列を足し忘れても、消し忘れても、コンパイルが落ちる。`Bottle` は生成型なので、`schema.prisma` を変えると連鎖して落ちる。読解の観点では、**ここが「スキーマの変更が届く場所」になっている**。

#### 実測した SQL と戻り値

```sql
SELECT "public"."bottle"."id", "public"."bottle"."name", "public"."bottle"."region",
       "public"."bottle"."isLimited", "public"."bottle"."quantity"
FROM "public"."bottle" WHERE "userId"=$1 OFFSET $2
```

**`id` が勝手に入っている。** `select` に書いていないにもかかわらず、Prisma が内部的に取得している。ところが戻り値のオブジェクトのキーは 4 つだけ：

```
["name","region","isLimited","quantity"]
```

**DB からは来ているが、Prisma がクライアント側で落としている。** 型と実物は一致しているので実害は無いが、「`select` で絞れば DB から来る量が減る」は正確ではない、という事実は押さえておく価値がある。

#### 集計後の型（`Bottle` 由来ではない）

```ts
export type BottleStats = {
  totalQuantity: number; // 本数（quantity の合計）
  brandCount: number; // 銘柄の異なり数
  regionCount: number; // 産地の異なり数
  regionQuantities: { region: string | null; quantity: number }[];
  maxRegionQuantity: number;
  limitedQuantity: number;
  regularQuantity: number;
  limitedPercent: number;
};
```

`BottleStats` は `Bottle` から派生していない**独立した型**である。集計の結果は列の集まりではないので、これは正しい。

ここで `normalizeText` が再登場する。

```ts
brandNames.add(normalizeText(bottle.name));
```

**`identityKey` は銘柄数の集計に使えない。** 4 項目の連結なので、「山崎 12 年」と「山崎（NAS）」が別のキーになってしまう。だから正規化関数だけを共用している（ADR-0013 が明記している論点）。

`region` を `null` のまま返し、「未設定」という表示は画面に任せている点も設計として一貫している。集計層はデータの形だけを扱い、表現は持たない。

---

## 5. 横断論点① 「未入力」の六つの表現

ここまでで見たとおり、**「その項目に値が無い」という一つの事実が、経路上で六通りに表現される**。

```
 ①  ""                 DOM とフォーム状態（テキスト系）
      │
      │ zod の transform（ステップ 3）
      ↓
 ②  undefined（キーあり） 検証を通った値
      │
      │ JSON.stringify（ステップ 4）        ← undefined は JSON に存在しない
      ↓
 ③  キー不在             リクエスト本文・サーバ側の検証結果
      │
      │ Prisma（ステップ 8）                ← undefined とキー不在を同一視
      ↓
 ④  列リストから除外       INSERT 文
      ↓
 ⑤  SQL NULL            DB の列
      │
      │ Prisma の戻り値（ステップ 10）
      ↓
 ⑥  null                生成型 Bottle・API 応答・編集の初期値の元

  ※ 別枠：identityKey の中では常に ""（ステップ 7 で ①〜⑥ のすべてが "" に潰れる）
```

編集フローはこの経路の一部を迂回する。

```
 ⑥  null（DB 由来）
      │ ?? "" または ?? undefined（ステップ E2）
      ↓
 ①/② に戻る
      │ zod（ステップ E4）
      ↓
 ②  undefined
      │ ?? null（ステップ E5）              ← 登録には無い変換
      ↓
      null → JSON にそのまま載る（キーは消えない）→ SQL NULL
```

### 同一視が起きる場所（実測にもとづく）

| 何と何が同じになるか             | どこで                           | 根拠                                           |
| -------------------------------- | -------------------------------- | ---------------------------------------------- |
| `""` と `undefined`              | zod の `transform`（ステップ 3） | `optionalText` の定義                          |
| `undefined` とキー不在           | `JSON.stringify`（ステップ 4）   | JSON に `undefined` が無い                     |
| `undefined` とキー不在           | Prisma（ステップ 8）             | 発行 SQL の列リストが完全に一致（実測 A と B） |
| `null` と `undefined` とキー不在 | `buildIdentityKey`（ステップ 7） | `age == null` の緩い等価比較                   |
| キー不在と `null`                | DB（ステップ 9）                 | 列に DEFAULT が無いので、書かなくても NULL     |
| すべて                           | 生成型 `Bottle`（ステップ 10）   | `null` の一種類に収束                          |

### HTTP の性質から来る制約

- **`undefined` はネットワークに乗らない。** JSON には該当する値が無い。だから「この項目を空にしてほしい」を伝える手段は `null` しかない。
- **`null` と「キー不在」は HTTP レベルで別の意味を持つ。** [RFC 7396](https://www.rfc-editor.org/rfc/rfc7396) は `null` を「削除」、キー不在を「変更しない」と規定している。[Google AIP-134](https://google.aip.dev/134) は部分更新にフィールドマスクを必須とし、マスクを省略した場合は「値が入っているフィールド全部」と解釈しなければならないとしている。
- **MyCellar は部分更新を採用していない。** `bottleUpdateSchema` が全項目必須なので、キー不在は「変更しない」ではなく「不正な入力（400）」になる。RFC の意味論と食い違うが、これは意図的な選択であり、理由は `identityKey` との整合（ADR-0011、ステップ E8）。

### 実測で見つかった落とし穴

**同じ画面状態から二通りのリクエストが出る。** 登録画面で産地を「未選択」のままにした場合と、一度選んでから「未選択」に戻した場合で、送られる JSON が違う（ステップ 2）。

| 操作           | 送られる JSON                                               | DB の列 |
| -------------- | ----------------------------------------------------------- | ------- |
| 一度も触らない | `{"name":"…","isLimited":false,"quantity":1}`               | `NULL`  |
| 選んで戻す     | `{"name":"…","region":null,"isLimited":false,"quantity":1}` | `NULL`  |

結果は同じなので実害は無い。ただし将来 API に部分更新（キー不在＝変更しない）を導入すると、**この二つが別の意味になる**。そのときは登録フォーム側も `?? null` を通す必要が出る。

---

## 6. 横断論点② 型の系譜

### 6.1 二つの根

```
prisma/schema.prisma
        │ prisma generate
        ↓
    Bottle（生成型・データの正本）
        ├── BottleForStats = Pick<Bottle, "name"|"region"|"isLimited"|"quantity">
        │     └── satisfies Record<keyof BottleForStats, true> で select と突き合わせ
        └── ExistingBottle = Pick<Bottle, "id"|"name"|"age"|"caskType"|"isLimited">
              （duplicate-bottle-toast.tsx。409 応答の表示に要る分だけ）

src/lib/schemas/bottle.ts
        │
    bottleSchema（契約の正本）
        ├── BottleInput  = z.input<typeof bottleSchema>    フォームが持つ値
        ├── BottleValues = z.output<typeof bottleSchema>   検証を通った値
        └── bottleUpdateSchema = bottleSchema.required()
              └── BottleUpdateValues = z.output<typeof bottleUpdateSchema>

（どちらの系譜にも属さない）
    BottleStats — 集計結果。列の集まりではないので Bottle 由来にしていない
    REGIONS     — 産地の固定リスト。DB には存在せず zod にだけある（ADR-0009）
```

### 6.2 `z.input` と `z.output` の差

差が出るのは `.default()` を持つ 2 項目だけである。

| カラム      | `BottleInput`                 | `BottleValues`                | 差の理由                              |
| ----------- | ----------------------------- | ----------------------------- | ------------------------------------- |
| `name`      | `string`                      | `string`                      | —                                     |
| `region`    | `enum \| null \| undefined`   | `enum \| null \| undefined`   | —                                     |
| `subRegion` | `string \| null \| undefined` | `string \| null \| undefined` | 型は同じだが `transform` が値を変える |
| `age`       | `number \| null \| undefined` | `number \| null \| undefined` | —                                     |
| `caskType`  | `string \| null \| undefined` | `string \| null \| undefined` | 型は同じだが `transform` が値を変える |
| `isLimited` | `boolean \| undefined`        | **`boolean`**                 | `.default(false)`                     |
| `quantity`  | `number \| undefined`         | **`number`**                  | `.default(1)`                         |
| `note`      | `string \| null \| undefined` | `string \| null \| undefined` | `transform` が値を変える              |

**型が同じでも値が変わる項目がある**点に注意したい（`subRegion`・`caskType`・`note`）。`""` が `undefined` になるのは値の変化であって型の変化ではないので、型シグネチャだけを見ても分からない。

`useForm<BottleInput, unknown, BottleValues>` の 3 つの型引数がこれを表現している（順に、フォームが持つ型／コンテキスト／変換後の型）。`handleSubmit` のコールバックが受け取るのは第 3 引数の `BottleValues` である。

### 6.3 `.required()` が変えるもの

| カラム                                               | `BottleValues`           | `BottleUpdateValues` | 変化                                                     |
| ---------------------------------------------------- | ------------------------ | -------------------- | -------------------------------------------------------- |
| `region` / `subRegion` / `age` / `caskType` / `note` | `T \| null \| undefined` | `T \| null`          | 省略不可になる                                           |
| `isLimited` / `quantity`                             | `boolean` / `number`     | `boolean` / `number` | 型は同じだが、**既定値が効かなくなる**（省略すると 400） |
| `name`                                               | `string`                 | `string`             | 変化なし                                                 |

型シグネチャだけを見ると `isLimited` と `quantity` は変わっていないように見える。しかし実行時の挙動は変わっている（実測）。**型を読むだけでは分からない差**であり、この文書で実測が必要だった理由の一つ。

### 6.4 `Pick` の使い分け

二つの `Pick` は、どちらも「必要な列だけを取る」という同じ形をしているが、**役割が正反対**である。

| 型               | 向き           | 効果                                                                             |
| ---------------- | -------------- | -------------------------------------------------------------------------------- |
| `BottleForStats` | **入力を絞る** | `select` と対にして、DB から取る列を減らす。`satisfies` でスキーマ変更を検知する |
| `ExistingBottle` | **出力を絞る** | 表示に使う列を宣言する。ただし代入元が `any` なので実行時の保証は無い（第 8 章） |

---

## 7. 横断論点③ 導出値 `identityKey` のライフサイクル

`identityKey` は他の 12 列と根本的に性質が違う。**入力に存在せず、サーバでのみ生まれ、書き込みのたびに作り直され、そして過去に固定されている。**

### 7.1 他の列との違い

| 観点               | 通常の列（例：`caskType`） | `identityKey`                                           |
| ------------------ | -------------------------- | ------------------------------------------------------- |
| 入力に存在するか   | する                       | **しない**                                              |
| 誰が値を決めるか   | 利用者                     | `buildIdentityKey`                                      |
| いつ生まれるか     | ステップ 1                 | ステップ 7                                              |
| 更新時             | 送られた値で置き換わる     | **毎回再計算される**（変わっていなくても `SET` に載る） |
| 表現を変えられるか | 変えられる                 | **変えられない**（既存行が無効になる）                  |
| 表示されるか       | される                     | されない（応答には出るが UI では使わない）              |

### 7.2 「過去に固定されている」とはどういうことか

`normalizeText` の実装、区切り文字、`age` を `""` にする規則、`isLimited` を `"1"/"0"` にする規則 —— これらを一つでも変えると、**新しく書かれた行だけが新しい規則で計算され、既存行は古い規則のまま残る**。同じ物が別のキーを持ち、重複が素通りする。

ADR-0013 が「キーの文字列表現と適用順を変えるには、全行の再計算と重複の掃除が要る」「行が入る前に固めておく」と書いているのは、この性質を指している。

ADR-0013 が挙げている残る不確実性も記録しておく：`\p{Cf}` などの Unicode プロパティの中身は**実行エンジンが持つ Unicode のバージョンに依存する**。Node.js のバージョンが上がると、理論上は正規化結果が変わりうる。実務上は無視できる差だが、「未来永劫まったく同じ」ではない。

### 7.3 ADR-0013 の判断を実測で検証する

「4 列に一意制約を張っても効かない」という前提と、PostgreSQL 15 で追加された `NULLS NOT DISTINCT` の関係を、PostgreSQL 16 で実際に検証した。

すべて `userId = 'u1'`、`age = NULL`、`caskType = NULL` で、`name` だけを変えて挿入したときの結果：

| 制約の張り方                | `yamazaki` 2 回目 | `Ｙａｍａｚａｋｉ` | `  yamazaki  ` | 最終行数 |
| --------------------------- | ----------------- | ------------------ | -------------- | -------- |
| 素の 4 列 `UNIQUE`          | **入る**          | —                  | —              | **2**    |
| `UNIQUE NULLS NOT DISTINCT` | 弾かれる          | **入る**           | **入る**       | **3**    |
| 現行の `identityKey` 方式   | 弾かれる          | 弾かれる           | 弾かれる       | **1**    |

**結論：`NULLS NOT DISTINCT` を使っても表記ゆれは防げない。** ADR-0013 の理由は二つあり（NULL の非等価性と表記ゆれ）、この機能は前者しか解かない。後者を解くには結局どこかで正規化が要る。

理屈の上では、正規化を式インデックスに埋め込むことはできる（`CREATE UNIQUE INDEX … NULLS NOT DISTINCT ON bottle ("userId", normalize(lower(name), NFKC), …)`）。ただし不可視文字の除去には自作の `IMMUTABLE` 関数が必要になり、Prisma のスキーマからは表現できないため生 SQL のマイグレーションになる。導出列より重い。**別の道を通って同じ結論に着く**ので、ADR-0013 を書き換える理由は無い。

### 7.4 一意制約の実際の形

マイグレーションが作っているのは**テーブル制約ではなく一意インデックス**である。

```sql
CREATE UNIQUE INDEX "bottle_userId_identityKey_key" ON "bottle"("userId", "identityKey");
```

`identityKey` が `NOT NULL` なので、`NULLS DISTINCT`（既定）でも問題は起きない。

---

## 8. 型が保証していない三箇所

型検査を通るが、実行時には何も保証されていない箇所。優先度順に並べる。

### 8.1 `region` の `as` キャスト（最重要）

```ts
region: (bottle.region as (typeof REGIONS)[number] | null) ?? undefined,
```

`Bottle.region` の型は `string | null` である。`as` は**型検査を黙らせているだけで、実行時の検査は無い**。

DB に `'イングランド'`（`REGIONS` に無い値）を直接書き込んで、その行の編集画面を実測した。

| ステップ                    | 実測された状態                                                          |
| --------------------------- | ----------------------------------------------------------------------- |
| Prisma の戻り値             | `region: "イングランド"`（素通し）                                      |
| `as` キャスト後             | `"イングランド"`（**実行時の検査は無い**）                              |
| `defaultValues.region`      | `"イングランド"`                                                        |
| `<Select>` の DOM 上の値    | `"__none__"` ← **選択肢に無いのでフォールバックする**                   |
| 画面の表示                  | **「未選択」**                                                          |
| フォーム状態（`getValues`） | `"イングランド"` ← **画面と食い違う**                                   |
| 触らずに保存                | **無言で止まる**。`Invalid option: expected one of "スコットランド"｜…` |
| 産地を選び直して保存        | 通る（正常な値に置き換わる）                                            |

**画面には「未選択」と出ているのに、フォーム状態は `"イングランド"` のまま。** そして `region` には `<FieldError>` の表示口が無いので、保存ボタンを押しても何も起きない。利用者から見れば「保存できないが理由が分からない」状態になる。産地を選び直せば復帰する。

失われるのではなく**動かなくなる**、というのが正確な失敗の形である。第 8.3 節の `quantity` と同じ失敗の仕方であり、原因も同じ（「DB 由来の初期値が zod を通らない」）。

これは ADR-0009（`category` を廃止し、産地は zod の `REGIONS` で一元管理する）の代償である。

| 操作                             | 安全か   | 理由                                  |
| -------------------------------- | -------- | ------------------------------------- |
| `REGIONS` に産地を**追加**する   | 安全     | 既存行の値は `REGIONS` に含まれたまま |
| `REGIONS` から産地を**削除**する | **危険** | 既存行の値が型の外に出る              |
| `REGIONS` の表記を**変更**する   | **危険** | 同上（`"アメリカ"` → `"米国"` など）  |

ADR-0009 は「追加にマイグレーションは不要」と書いているが、**削除と改名が安全でないことは書かれていない**。実行時に検査するなら、`getOwnedBottle` の直後で `REGIONS.includes(bottle.region)` を確かめて、外れていたら `null` として扱う（あるいは選択肢に「不明」を足す）方法がある。ただし現状 `REGIONS` から削除する予定は無いため、直ちに手を入れる必要は無い。**知らずに削除しないこと**が対策になる。

### 8.2 409 応答の `any`

```ts
const { bottle } = await response.json(); // any
showDuplicateBottleToast(bottle); // 引数の型は ExistingBottle
```

ステップ 12 で見たとおり、`ExistingBottle` は実行時に何も保証していない。実際に来ているのは `createdAt: string` を含む 13 キーのオブジェクトで、`Bottle` 型（`createdAt: Date`）とは異なる。

いま使っている 5 キーはすべて型どおりなので実害は無いが、**この型は「そう来るはず」という期待の記録であって、保証ではない**。潰すなら 2 通りある。

1. **応答用の zod スキーマを作り、クライアント側でも `parse` する。** 最も確実だが、スキーマがもう一つ増える。
2. **サーバ側で応答の形を絞る。** 409 で行をまるごと返すのをやめ、`ExistingBottle` が要求する 5 列だけを返す。Next.js 公式の「戻り値は UI に必要な分だけ」に沿う形でもある。

コード中のコメント（「なんで、ここは any なんだろう！！」）が指しているのはこの箇所である。

### 8.3 `quantity` の下限を UI が保証している

```tsx
// UI からは 1 未満・小数を作れないので検証エラーの表示は置かない。
// 代わりに、DB 由来の初期値が不正だと送信が無言で止まる（文言が出ない）。
```

`quantity` にはエラー表示口が無い。編集フォームの初期値は DB 由来なので、DB に `0` や小数が入っていると `min(1)` / `int()` で弾かれ、**何も表示されないまま送信が止まる**。

ただし、その状態を作る経路は現状存在しない。API も `bottleSchema` を通すので `0` は入らず、UI のボタンは `disabled={quantity <= 1}` で守られている。**手で DB を触った場合にだけ起こる**。実害の可能性は低いが、「UI が保証していて型は保証していない」という構造は記録しておく。

### 8.4 補足：型が正しく効いている箇所

対比のために挙げておく。

- **`satisfies Record<keyof BottleForStats, true>`** — `select` と `Pick` の過不足がコンパイルエラーになる。スキーマ変更が確実に届く唯一の場所。
- **`redirect()` が `never` を返す** — `requireSession` を通過した後、呼び出し側では `session` が非 null に絞り込まれる。型で制御フローを表現している。
- **`CreateResult` / `UpdateResult` の直和型** — `status` による判別可能なユニオンなので、`duplicate` のときだけ `bottle` にアクセスできる。HTTP ステータス（400 と 409 の使い分け）と型が一対一に対応している。

---

## 付録A 実測ログ（抜粋）

### A.1 登録：三つの経路が同じ NULL に着く

| 渡したもの               | 発行された INSERT の列                                                             | DB の列 |
| ------------------------ | ---------------------------------------------------------------------------------- | ------- |
| キー不在                 | `id, userId, name, isLimited, quantity, identityKey, createdAt, updatedAt`（8 列） | `NULL`  |
| キーあり・値 `undefined` | **上と完全に同一**（8 列）                                                         | `NULL`  |
| 明示 `null`              | 13 列すべて、`region`〜`note` に `null`                                            | `NULL`  |

### A.2 zod の入出力（`bottleSchema`）

| 入力                                                  | 出力のキー                        | 出力の値                                                                  |
| ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| `{name:"yamazaki"}`                                   | `["name","isLimited","quantity"]` | `{name:"yamazaki", isLimited:false, quantity:1}`                          |
| `{name:"…", subRegion:"", caskType:"   ", note:"　"}` | 6 キー                            | 3 項目が `undefined`（キーは残る）                                        |
| `{name:"…", region:null, …}`                          | 8 キー                            | `null` がそのまま残る                                                     |
| `{name:"…", userId:"attacker", identityKey:"x"}`      | `["name","isLimited","quantity"]` | 未知のキーは strip される                                                 |
| `{name:"…", age:"12"}`                                | —                                 | `invalid_type`（`z.number()` は変換しない）                               |
| `{name:"…", age:0 / -1 / 1.5}`                        | —                                 | すべて「年数は1以上の整数で入力してください」                             |
| `{name:"  Ｙａｍａｚａｋｉ　１２  "}`                 | —                                 | 保存値は `"Ｙａｍａｚａｋｉ　１２"`（trim のみ）、キーは `yamazaki12␟␟␟0` |

### A.3 `bottleUpdateSchema`

| 送った本文                      | 結果                                              |
| ------------------------------- | ------------------------------------------------- |
| 8 項目すべて（空欄は `null`）   | 通る                                              |
| `quantity` / `isLimited` を省略 | 400（`invalid_type`）                             |
| 任意 5 項目を省略               | 400（`invalid_type` × 5）                         |
| 空欄に `""`                     | 400（`expected nonoptional, received undefined`） |

### A.4 フォーム側（jsdom）

| シナリオ               | フォーム状態                              | 検証後                       | 送られる JSON         |
| ---------------------- | ----------------------------------------- | ---------------------------- | --------------------- |
| 登録・銘柄名だけ       | `age`/`region` が `undefined`（キーあり） | 8 キー、5 項目が `undefined` | 3 キー                |
| 登録・産地を選んで戻す | `region: null`                            | `region: null`               | `region:null` が載る  |
| 登録・年数に `abc`     | `age: undefined`                          | 同左                         | `age` は載らない      |
| 登録・年数に `0`       | `age: 0`                                  | **検証で止まる**             | 送信されない          |
| 編集・何も触らない     | テキスト系が `""`                         | `undefined`                  | `?? null` 後に 8 キー |
| 編集・樽を空にする     | `caskType: ""`                            | `undefined`                  | `caskType:null`       |

### A.5 `region` が `REGIONS` の外にあるとき（編集画面）

DB の `region` が `'イングランド'` の行を編集する。

| 操作                    | 画面の表示 | フォーム状態     | 送信                                               |
| ----------------------- | ---------- | ---------------- | -------------------------------------------------- |
| 触らずに保存            | 「未選択」 | `"イングランド"` | **無言で止まる**（`Invalid option`、表示口が無い） |
| 日本を選び直して保存    | 「日本」   | `"日本"`         | 通る（`region:"日本"`）                            |
| 未選択を選び直して保存  | 「未選択」 | `null`           | 通る（`region:null`）                              |
| （比較）`region='日本'` | 「日本」   | `"日本"`         | 通る                                               |

### A.6 `identityKey`

| 入力                                               | キー                                  |
| -------------------------------------------------- | ------------------------------------- |
| `{name:"yamazaki"}` / `age:null` / `age:undefined` | すべて `yamazaki␟␟␟0`（同値）         |
| `{name:"yamazaki", age:0}`                         | `yamazaki␟0␟␟0`（別。ただし到達不能） |
| `{name:"Ｙａｍａｚａｋｉ"}`                        | `yamazaki␟␟␟0`                        |
| `{name:"  yamazaki  "}`                            | `yamazaki␟␟␟0`                        |

### A.7 認可（`where` に `userId` を含める効果）

| 操作           | 発行された SQL                                      | 結果                     |
| -------------- | --------------------------------------------------- | ------------------------ |
| 他人として更新 | UPDATE は発行される（`userId=$12` が `"u2_other"`） | `count: 0` → 404         |
| 他人として削除 | DELETE は発行される                                 | `count: 0` → 404         |
| 本人として削除 | 同上                                                | `count: 1` → `{ok:true}` |

---

## 付録B 再現手順

この文書の実測値は、次の三つの環境で得た。いずれもリポジトリには何も書き込んでいない。

### B.1 zod だけの検証（A.2 / A.3 / A.6）

`zod@4.4.3` と `src/lib/schemas/bottle.ts` / `src/lib/bottle-identity.ts` があれば足りる。`bottleSchema.parse()` の結果に対して `Object.keys()` と `"key" in obj` を取ると、キーの存否が観測できる。

> `toEqual` はキーの存否を区別しない（`{a:undefined}` と `{}` を等しいと見なす）。既存の `bottle.test.ts` からはこの差が読めないので、`Object.keys` で確認する必要がある。

### B.2 フォーム側の検証（A.4 / A.5）

jsdom 上で `react@19.2.4` / `react-hook-form@7.81.0` / `@hookform/resolvers@5.4.0` を使い、`bottle-form.tsx` と同じ形（`register` + `setValueAs`、`Controller` + `NONE` センチネル）でフォームを組む。`handleSubmit` のコールバックで `getValues()`（フォーム状態）と引数（検証後）の両方を取ると、ステップ 2 とステップ 3 の差が観測できる。

### B.3 DB を含む検証（A.1 / A.7 / 第 7.3 節）

1. PostgreSQL 16 を起動し、空の DB を作る。
2. `prisma/migrations/*/migration.sql` を作成日時順に `psql -f` で適用する（`prisma migrate deploy` と同じ結果になる）。
3. `PrismaClient` を `log: [{ emit: "event", level: "query" }]` で生成し、`$on("query")` で発行 SQL を収集する。
4. `src/lib/bottles.ts` の `createBottle` / `updateBottle` をそのまま呼ぶ。
5. 列の実際の値は `$queryRawUnsafe` で確認する（Prisma の戻り値は `null` に正規化されているため、SQL NULL かどうかを見るには生クエリが要る）。

> `prisma generate` と `prisma migrate` は `binaries.prisma.sh` から schema-engine を取得しようとする。ネットワークが閉じている環境では失敗するが、**生成済みクライアントがあれば実行時は動く**（Prisma 7 の driver adapter 構成では、クエリコンパイラが WASM としてクライアントに同梱されている）。マイグレーションは上記のとおり `psql` で直接適用すればよい。

---

## 参照

- `prisma/schema.prisma` — データモデルの正本。フィールド単位の説明は `///` コメント
- `src/lib/schemas/bottle.ts` — 入力契約の正本
- `docs/data-model.md` — 行の粒度と「同じ物」の定義
- `docs/adr.md` — ADR-0002（読み書きの分担）、ADR-0009（産地）、ADR-0011（PATCH）、ADR-0013（同一性）
- [RFC 7396: JSON Merge Patch](https://www.rfc-editor.org/rfc/rfc7396) — `null` は削除、キー不在は無変更
- [Google AIP-134: Standard methods: Update](https://google.aip.dev/134) — PATCH とフィールドマスク
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html) — 一意制約と NULL、`NULLS NOT DISTINCT`（15 で追加）
- [UAX #15: Unicode Normalization Forms](https://unicode.org/reports/tr15/) — 互換正規化は照合のための変換であって保存のための変換ではない
- [RFC 8264: PRECIS Framework](https://www.rfc-editor.org/rfc/rfc8264.html) — 国際化文字列の比較における操作順序の規定
- [How to think about data security in Next.js](https://nextjs.org/docs/app/guides/data-security) — DAL・DTO・認可の再検証
