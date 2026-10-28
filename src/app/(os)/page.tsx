import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { DateBar } from "@/components/date-bar";
import { DashboardView } from "@/components/dashboard-view";
import { PageHeader } from "@/components/bits";
import { getDb } from "@/lib/db";
import { resolveRange, shanghaiToday } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { countDemo, computeDashboard, scopeSnapshot } from "@/lib/metrics";
import { one } from "@/lib/query";

export default function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在汇总…</p>}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const today = shanghaiToday();
  const range = resolveRange({ preset: one(params, "preset"), from: one(params, "from"), to: one(params, "to") }, today);
  const includeDemo = one(params, "demo") === "1";
  const snapshot = scopeSnapshot(await (await getDb()).loadSnapshot(), user.role);
  const model = computeDashboard(snapshot, range, today, includeDemo);
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="经营总览"
        description="北极星是每月新增、广告前贡献利润为正的有效付费订单。下面的数字都从数据库现算，没有写死的业绩。"
      />
      <DateBar path="/" preset={range.preset} from={range.from} to={range.to} includeDemo={includeDemo} demoCount={countDemo(snapshot)} />
      <DashboardView model={model} showOrders={can(user.role, "orders.read")} preset={range.preset} includeDemo={includeDemo} />
    </>
  );
}
