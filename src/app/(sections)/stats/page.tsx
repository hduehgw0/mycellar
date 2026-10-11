import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  summarizeCollection,
  WHISKY_STATS_SELECT,
} from "@/lib/collection-stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "傾向" };

// 0% と 100% は、限定版が 1 本も無いときと、全部が限定版のときだけ出す。
function formatPercent(percent: number): string {
  if (percent > 0 && percent < 1) return "<1";
  if (percent > 99 && percent < 100) return ">99";
  return String(Math.round(percent));
}

export default async function StatsPage() {
  const session = await requireSession();

  const whiskies = await prisma.whisky.findMany({
    where: { userId: session.user.id },
    select: WHISKY_STATS_SELECT,
  });

  const stats = summarizeCollection(whiskies);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold">傾向</h1>
        <p className="text-sm text-muted-foreground">
          コレクションの偏りを眺める
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-4 rounded-lg border border-primary/20 bg-linear-to-br from-primary/10 to-card p-5">
        {[
          { label: "総本数", value: stats.totalBottleCount, unit: "本" },
          { label: "製品数", value: stats.whiskyCount, unit: "種" },
          { label: "国", value: stats.countryCount, unit: "か国" },
        ].map(({ label, value, unit }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-heading text-4xl font-bold">
              {value}
              <span className="text-base font-normal text-muted-foreground">
                {unit}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {stats.totalBottleCount === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          製品を登録すると、ここに傾向が出ます。
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-lg font-bold">国別の本数</h2>
              <p className="text-xs text-muted-foreground">本数の多い順</p>
            </div>
            <dl className="flex flex-col gap-3.5">
              {stats.bottleCountsByCountry.map(({ country, bottleCount }) => {
                const isUnset = country === null;
                return (
                  <div
                    key={country ?? "unset"}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1.5"
                  >
                    <dt
                      className={cn(
                        "text-sm",
                        isUnset && "text-muted-foreground",
                      )}
                    >
                      {country ?? "未設定"}
                    </dt>
                    <dd className="text-sm font-bold">{bottleCount}本</dd>
                    {/* 長さは最も多い国を 100% とする比率。全体に対する比率だと
                        差が潰れて偏りが見えない。
                        バーを 2 つ目の dd にするのは、dl 直下の div に置けるのが
                        dt と dd だけのため（col-span-2 で 2 行目の全幅になる）。 */}
                    <dd
                      aria-hidden
                      className="col-span-2 h-2 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isUnset ? "bg-chart-2" : "bg-chart-1",
                        )}
                        style={{
                          width: `${(bottleCount / stats.maxCountryBottleCount) * 100}%`,
                        }}
                      />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <section className="flex flex-col gap-3.5 rounded-lg border bg-card p-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-lg font-bold">限定版の割合</h2>
              <p className="font-heading text-4xl font-bold text-primary">
                {formatPercent(stats.limitedPercent)}
                <span className="text-base">%</span>
              </p>
            </div>
            <div aria-hidden className="h-2.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${stats.limitedPercent}%` }}
              />
            </div>
            <dl className="flex items-center justify-between gap-4 text-sm">
              {[
                {
                  label: "限定版",
                  value: stats.limitedBottleCount,
                  color: "bg-chart-1",
                },
                {
                  label: "通常",
                  value: stats.regularBottleCount,
                  color: "bg-chart-2",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  {/* 色見本は dt の中に置く。dl 直下の div には dt と dd しか置けない。 */}
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span
                      aria-hidden
                      className={cn("size-3 rounded-xs", color)}
                    />
                    {label}
                  </dt>
                  <dd className="font-bold">{value}本</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </>
  );
}
