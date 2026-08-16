import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UNSET_REGION, summarizeCollection } from "@/lib/bottle-stats";
import { cn } from "@/lib/utils";

export default async function StatsPage() {
  const session = await requireSession();

  const bottles = await prisma.bottle.findMany({
    where: { userId: session.user.id },
    select: { name: true, region: true, isLimited: true, quantity: true },
  });

  const stats = summarizeCollection(bottles);
  // バーの長さは最も多い産地を満たす比率。全体に対する比率だと差が潰れて偏りが見えない。
  const longest = stats.regionTotals[0]?.quantity ?? 0;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold">傾向</h1>
        <p className="text-sm text-muted-foreground">
          コレクションの偏りを眺める
        </p>
      </div>

      <dl className="flex items-end justify-between gap-4 rounded-lg border border-primary/20 bg-linear-to-br from-primary/10 to-card p-5">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">総本数</dt>
          <dd className="font-heading text-5xl font-bold">
            {stats.total}
            <span className="text-base font-normal text-muted-foreground">
              本
            </span>
          </dd>
        </div>
        {[
          { label: "銘柄数", value: stats.brands },
          { label: "産地数", value: stats.regions },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-heading text-3xl font-bold text-primary">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {stats.total === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          ボトルを登録すると、ここに傾向が出ます。
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-lg font-bold">産地別の本数</h2>
              <p className="text-xs text-muted-foreground">
                本数の多い順・全{stats.total}本
              </p>
            </div>
            <dl className="flex flex-col gap-3.5">
              {stats.regionTotals.map(({ region, quantity }) => {
                const unset = region === UNSET_REGION;
                return (
                  <div key={region} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt
                        className={cn(
                          "text-sm",
                          unset && "text-muted-foreground",
                        )}
                      >
                        {region}
                      </dt>
                      <dd className="text-sm font-bold">{quantity}本</dd>
                    </div>
                    {/* 本数は上に文字で出ているので、バーは絵として読み上げから外す。 */}
                    <div aria-hidden className="h-2 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          unset ? "bg-chart-2" : "bg-chart-1",
                        )}
                        style={{ width: `${(quantity / longest) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </dl>
          </section>

          <section className="flex flex-col gap-3.5 rounded-lg border bg-card p-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-lg font-bold">限定版の割合</h2>
              <p className="font-heading text-4xl font-bold text-primary">
                {stats.limitedPercent}
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
                { label: "限定版", value: stats.limited, color: "bg-chart-1" },
                { label: "通常", value: stats.regular, color: "bg-chart-2" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn("size-3 rounded-xs", color)}
                  />
                  <dt className="text-muted-foreground">{label}</dt>
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
