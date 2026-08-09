import { requireSession } from "@/lib/session";

// タブの行き先として存在させるだけの置き場。中身（集計・グラフ）は #61。
export default async function StatsPage() {
  await requireSession();

  return <h1 className="font-heading text-xl font-bold">傾向</h1>;
}
