"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MinusIcon, PlusIcon } from "lucide-react";
import {
  CASK_TYPES,
  COUNTRIES,
  REGIONS,
  whiskyFormSchema,
  type WhiskyFormInput,
  type WhiskyFormOutput,
} from "@/lib/schemas/whisky";
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

// 「未選択」用の値。Radix の SelectItem は空文字の値を禁止するため、
// 空でない値を持たせ、選んだら null に戻す（送信データには出さない）。
const NONE = "__none__";

const LABEL_CLASS = "gap-1.5 text-xs text-muted-foreground";

const CARD_CLASS = "rounded-lg border border-input bg-input/30 p-2.5";

// 登録・編集で共有する製品のフォーム（UI と検証）。
// 送信先・初期値・文言・遷移などの差分は、各ページのラッパーが props で渡す。
export function WhiskyForm({
  defaultValues,
  submitLabel,
  submittingLabel,
  errorLabel,
  onSubmit,
}: {
  defaultValues: WhiskyFormInput;
  submitLabel: string;
  submittingLabel: string;
  errorLabel: string;
  // 失敗の文言を出してほしいときだけ "failed" を返す。重複のトーストや遷移はラッパーが行う。
  onSubmit: (data: WhiskyFormOutput) => Promise<"failed" | void>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WhiskyFormInput, unknown, WhiskyFormOutput>({
    resolver: zodResolver(whiskyFormSchema),
    defaultValues,
  });
  const isScotland = useWatch({
    control,
    name: "country",
    compute: (country) => country === "スコットランド",
  });

  const submit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      // 想定内の失敗は "failed" が返る＝文言のみ。想定外の例外だけ catch でログする。
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
      // 自動補完抑止の保険（Chrome の住所サジェストはこれを無視するため、本対策は製品名の属性側）。
      autoComplete="off"
    >
      <FieldGroup className="gap-4">
        {/*
          製品名は Chrome に氏名と誤認され、autocomplete="off" だけでは
          住所サジェストを抑止できない（Chrome は off を無視して name/id から用途を推測する）。
          認識されない name/id に変えるのが確実な回避策だが、register は DOM の name 属性に
          依存するため、この欄だけ Controller で接続して属性を自由にしている。
        */}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="whisky-name" className={LABEL_CLASS}>
            製品名<span className="text-destructive">*必須</span>
          </FieldLabel>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                {...field}
                id="whisky-name"
                name="whisky-name"
                autoComplete="off"
                placeholder="例：ザ・マッカラン 12年 シェリーオーク"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "whisky-name-error" : undefined}
              />
            )}
          />
          {/* role="alert"（FieldError 既定）は出現時、aria-describedby はフォーカス時に
              読まれる。先頭のエラーは二重に読まれるが、role を外すと 2 件目以降が無音になる。 */}
          <FieldError id="whisky-name-error" errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="country" className={LABEL_CLASS}>
            国
          </FieldLabel>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Select
                value={field.value ?? NONE}
                onValueChange={(value) => {
                  const next = value === NONE ? null : value;
                  field.onChange(next);
                  // 地域はスコットランドの中の区分なので、他の国に変えたら消す。
                  if (next !== "スコットランド") setValue("region", null);
                }}
              >
                <SelectTrigger id="country" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>未選択</SelectItem>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {isScotland && (
          <Field>
            <FieldLabel htmlFor="region" className={LABEL_CLASS}>
              地域
            </FieldLabel>
            <Controller
              control={control}
              name="region"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                >
                  <SelectTrigger id="region" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
        )}

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
              min={0}
              max={100}
              placeholder="例：12"
              aria-invalid={!!errors.age}
              aria-describedby={errors.age ? "age-error" : undefined}
              {...register("age", {
                setValueAs: (value) => (value === "" ? null : Number(value)),
              })}
            />
            <FieldError id="age-error" errors={[errors.age]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="caskType" className={LABEL_CLASS}>
              樽
            </FieldLabel>
            <Controller
              control={control}
              name="caskType"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                >
                  <SelectTrigger id="caskType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>未選択</SelectItem>
                    {CASK_TYPES.map((caskType) => (
                      <SelectItem key={caskType} value={caskType}>
                        {caskType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        <Controller
          control={control}
          name="quantity"
          render={({ field }) => {
            // UI からは 1〜99 の外や小数を作れないので検証エラーの表示は置かない。
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
                  <output className="w-6 text-center text-base">
                    {quantity}
                  </output>
                  <Button
                    type="button"
                    size="icon"
                    // 増やす側だけ目立たせる（+ は primary の薄塗り＝accent、− は無彩色）。
                    className="bg-accent text-accent-foreground hover:bg-accent/70"
                    aria-label="1 本増やす"
                    disabled={quantity >= 99}
                    onClick={() => field.onChange(quantity + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
              </Field>
            );
          }}
        />

        <Field data-invalid={!!errors.memo}>
          <FieldLabel htmlFor="memo" className={LABEL_CLASS}>
            メモ
          </FieldLabel>
          {/* 入力に合わせて伸びる（field-sizing-content）ので、手で掴む余地は残さない。 */}
          <Textarea
            id="memo"
            placeholder="この製品についてのメモ（任意）"
            className="resize-none"
            aria-invalid={!!errors.memo}
            aria-describedby={errors.memo ? "memo-error" : undefined}
            {...register("memo")}
          />
          <FieldError id="memo-error" errors={[errors.memo]} />
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
