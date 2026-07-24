"use client";

import { useState } from "react";
import { Controller, useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { bottleSchema, REGIONS } from "@/lib/schemas/bottle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// フォームの入力／出力型（登録・編集で共有）。onSubmit は zod 変換後の値を受け取る。
export type BottleFormInput = z.input<typeof bottleSchema>;
export type BottleFormValues = z.output<typeof bottleSchema>;

// 数値入力：空欄は「未入力」として undefined を渡す（zod 側で NAS／既定値の扱いを決める）。
const asOptionalNumber = (value: unknown) =>
  value === "" || value == null ? undefined : Number(value);

// 国の「未選択」用センチネル。Radix の SelectItem は空文字値を禁止するため、
// 空でないダミー値を持たせ、選択時に null（＝クリア）へ正規化する（送信データには出さない）。
const NONE = "__none__";

// 登録・編集で共有するボトルフォーム（純粋な UI＋検証）。
// 送信先・初期値・文言・遷移などの差分は、各ページのラッパーが props で渡す。
export function BottleForm({
  defaultValues,
  submitLabel,
  submittingLabel,
  errorLabel,
  onSubmit,
}: {
  defaultValues: DefaultValues<BottleFormInput>;
  submitLabel: string;
  submittingLabel: string;
  errorLabel: string;
  onSubmit: (data: BottleFormValues) => Promise<boolean>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BottleFormInput, unknown, BottleFormValues>({
    resolver: zodResolver(bottleSchema),
    defaultValues,
  });

  const submit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      // 想定内の失敗（サーバが !ok）は false が返る＝文言のみ。想定外の例外だけ catch でログする。
      const ok = await onSubmit(data);
      if (!ok) setServerError(errorLabel);
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
      <FieldGroup>
        {/*
          銘柄名・地域は Chrome に氏名・住所と誤認され、autocomplete="off" だけでは
          住所サジェストを抑止できない（Chrome は off を無視して name/id から用途を推測する）。
          認識されない name/id に変えるのが確実な回避策だが、register は DOM の name 属性に
          依存するため、この 2 フィールドだけ Controller で接続して属性を自由にしている。
        */}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="bottle-name">銘柄名（必須）</FieldLabel>
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

        <Field>
          <FieldLabel htmlFor="region">国</FieldLabel>
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
                  {/* 「未選択」で国をクリアできる（センチネル→null に正規化）。 */}
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
          <FieldLabel htmlFor="bottle-subregion">地域</FieldLabel>
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
                placeholder="アイラ、スペイサイド など"
              />
            )}
          />
        </Field>

        <Field data-invalid={!!errors.age}>
          <FieldLabel htmlFor="age">年数</FieldLabel>
          <Input
            id="age"
            type="number"
            min={1}
            placeholder="空欄 = NAS"
            aria-invalid={!!errors.age}
            {...register("age", { setValueAs: asOptionalNumber })}
          />
          <FieldError errors={[errors.age]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="caskType">樽</FieldLabel>
          <Input
            id="caskType"
            placeholder="シェリー樽、バーボン樽 など"
            {...register("caskType")}
          />
        </Field>

        <Field orientation="horizontal">
          <Controller
            control={control}
            name="isLimited"
            render={({ field }) => (
              <Checkbox
                id="isLimited"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <FieldLabel htmlFor="isLimited">限定版</FieldLabel>
        </Field>

        <Field data-invalid={!!errors.quantity}>
          <FieldLabel htmlFor="quantity">本数</FieldLabel>
          <Input
            id="quantity"
            type="number"
            min={1}
            aria-invalid={!!errors.quantity}
            {...register("quantity", { setValueAs: asOptionalNumber })}
          />
          <FieldError errors={[errors.quantity]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="note">メモ</FieldLabel>
          <Textarea id="note" {...register("note")} />
        </Field>

        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
