"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

// 数値入力：空欄は「未入力」として undefined を渡す（zod 側で NAS／既定値の扱いを決める）。
const asOptionalNumber = (value: unknown) =>
  value === "" || value == null ? undefined : Number(value);

export function BottleForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bottleSchema),
    defaultValues: {
      name: "",
      subRegion: "",
      caskType: "",
      isLimited: false,
      quantity: 1,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const response = await fetch("/api/bottles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        setServerError("登録に失敗しました。もう一度お試しください。");
        return;
      }
      router.push("/bottles");
      router.refresh();
    } catch {
      setServerError("登録に失敗しました。もう一度お試しください。");
    }
  });

  return (
    <form
      onSubmit={onSubmit}
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
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="未選択" />
                </SelectTrigger>
                <SelectContent>
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
          {isSubmitting ? "登録中…" : "登録する"}
        </Button>
      </FieldGroup>
    </form>
  );
}
