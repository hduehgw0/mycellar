"use client";

import { useState } from "react";
import { Controller, useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MinusIcon, PlusIcon } from "lucide-react";
import {
  bottleSchema,
  REGIONS,
  type BottleInput,
  type BottleValues,
} from "@/lib/schemas/bottle";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// 送信結果。重複（409）は入力の誤りではなくトーストで既存ボトルを示すため、
// フォーム内の文言を出す "failed" とは分ける。
type SubmitOutcome = "ok" | "duplicate" | "failed";

// 数値入力：空欄は「未入力」として undefined を渡す（zod 側で NAS／既定値の扱いを決める）。
const asOptionalNumber = (value: unknown) =>
  value === "" || value == null ? undefined : Number(value);

// 産地の「未選択」用センチネル。Radix の SelectItem は空文字値を禁止するため、
// 空でないダミー値を持たせ、選択時に null（＝クリア）へ正規化する（送信データには出さない）。
const NONE = "__none__";

const LABEL_CLASS = "gap-1.5 text-xs text-muted-foreground";

const CARD_CLASS = "rounded-lg border border-input bg-input/30 p-2.5";

// 登録・編集で共有するボトルフォーム（純粋な UI＋検証）。
// 送信先・初期値・文言・遷移などの差分は、各ページのラッパーが props で渡す。
export function BottleForm({
  defaultValues,
  submitLabel,
  submittingLabel,
  errorLabel,
  onSubmit,
}: {
  defaultValues: DefaultValues<BottleInput>;
  submitLabel: string;
  submittingLabel: string;
  errorLabel: string;
  onSubmit: (data: BottleValues) => Promise<SubmitOutcome>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BottleInput, unknown, BottleValues>({
    resolver: zodResolver(bottleSchema),
    defaultValues,
  });

  const submit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      // 想定内の失敗は "failed" が返る＝文言のみ。想定外の例外だけ catch でログする。
      // "duplicate" は呼び出し側がトーストで知らせるので、ここでは何も出さない。
      if ((await onSubmit(data)) === "failed") setServerError(errorLabel);
    } catch (error) {
      console.error(error);
      setServerError(errorLabel);
    }
  });

  return (
    <form
      onSubmit={submit}
      noValidate
      // 自動補完抑止の保険（Chrome の住所サジェストはこれを無視するため、本対策は銘柄名・地域の属性側）。
      autoComplete="off"
    >
      <FieldGroup className="gap-4">
        {/*
          銘柄名・地域は Chrome に氏名・住所と誤認され、autocomplete="off" だけでは
          住所サジェストを抑止できない（Chrome は off を無視して name/id から用途を推測する）。
          認識されない name/id に変えるのが確実な回避策だが、register は DOM の name 属性に
          依存するため、この 2 フィールドだけ Controller で接続して属性を自由にしている。
        */}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="bottle-name" className={LABEL_CLASS}>
            銘柄名<span className="text-destructive">*必須</span>
          </FieldLabel>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                {...field}
                id="bottle-name"
                name="bottle-name"
                autoComplete="off"
                aria-invalid={!!errors.name}
              />
            )}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="region" className={LABEL_CLASS}>
              産地
            </FieldLabel>
            <Controller
              control={control}
              name="region"
              render={({ field }) => (
                <Select
                  // null のときは「未選択」項目（NONE）を選択状態にする（プレースホルダではなくチェックを付ける）。
                  value={field.value ?? NONE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                >
                  <SelectTrigger id="region">
                    <SelectValue placeholder="未選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 「未選択」で産地をクリアできる（センチネル→null に正規化）。 */}
                    <SelectItem value={NONE}>未選択</SelectItem>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="bottle-subregion" className={LABEL_CLASS}>
              地域
            </FieldLabel>
            <Controller
              control={control}
              name="subRegion"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id="bottle-subregion"
                  name="bottle-subregion"
                  autoComplete="off"
                  placeholder="任意"
                />
              )}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.age}>
            <FieldLabel htmlFor="age" className={LABEL_CLASS}>
              年数
              <span className="font-normal text-muted-foreground/70">
                空欄＝NAS
              </span>
            </FieldLabel>
            <Input
              id="age"
              type="number"
              min={1}
              aria-invalid={!!errors.age}
              {...register("age", { setValueAs: asOptionalNumber })}
            />
            <FieldError errors={[errors.age]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="caskType" className={LABEL_CLASS}>
              樽
            </FieldLabel>
            <Input id="caskType" placeholder="任意" {...register("caskType")} />
          </Field>
        </div>

        <Field orientation="horizontal" className={CARD_CLASS}>
          <FieldLabel htmlFor="isLimited">限定版</FieldLabel>
          <Controller
            control={control}
            name="isLimited"
            render={({ field }) => (
              <Switch
                id="isLimited"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        <Controller
          control={control}
          name="quantity"
          render={({ field }) => {
            // UI からは 1 未満・小数を作れないので検証エラーの表示は置かない。
            // 代わりに、DB 由来の初期値が不正だと送信が無言で止まる（文言が出ない）。
            const quantity = field.value ?? 1;
            return (
              // Field が role="group" を持つので、名前だけ渡して内側は素の div。
              <Field
                orientation="horizontal"
                className={CARD_CLASS}
                aria-labelledby="quantity-label"
              >
                <FieldTitle id="quantity-label">本数</FieldTitle>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="1 本減らす"
                    disabled={quantity <= 1}
                    onClick={() => field.onChange(quantity - 1)}
                  >
                    <MinusIcon />
                  </Button>
                  {/* ボタン名は増減しか伝えない。output は増減後の本数を読み上げる。 */}
                  <output className="w-6 text-center text-sm">
                    {quantity}
                  </output>
                  <Button
                    type="button"
                    size="icon"
                    // 増やす側だけ目立たせる（+ は primary の薄塗り＝accent、− は無彩色）。
                    className="bg-accent text-accent-foreground hover:bg-accent/70"
                    aria-label="1 本増やす"
                    onClick={() => field.onChange(quantity + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </Field>
            );
          }}
        />

        <Field>
          <FieldLabel htmlFor="note" className={LABEL_CLASS}>
            メモ
          </FieldLabel>
          {/* 入力に合わせて伸びる（field-sizing-content）ので、手で掴む余地は残さない。 */}
          <Textarea
            id="note"
            placeholder="味わいや感想など（任意）"
            className="resize-none"
            {...register("note")}
          />
        </Field>

        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
