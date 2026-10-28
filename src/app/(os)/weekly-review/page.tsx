import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { Kpi, PageHeader, Panel } from "@/components/bits";
import { WeeklyForm } from "@/components/record-forms";
import { getDb } from "@/lib/db";
import { addDays, isYmd, mondayOf, shanghaiToday, weekEnd } from "@/lib/dates";
import { formatInt, formatUsdCents } from "@/lib/money";
import { computeDashboard, scopeSnapshot } from "@/lib/metrics";
import { can } from "@/lib/permissions";
import { one } from "@/lib/query";
import type { WeeklyAnswers } from "@/lib/types";

const empty: WeeklyAnswers = { q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "", improvements: "" };

export default function WeeklyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在汇总这一周…</p>}>
      <Weekly searchParams={searchParams} />
    </Suspense>
  );
}

async function Weekly({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const today = shanghaiToday();
  const requested = one(params, "week");
  const week = isYmd(requested) ? mondayOf(requested) : mondayOf(today);
  const snapshot = scopeSnapshot(await (await getDb()).loadSnapshot(), user.role);
  const model = computeDashboard(snapshot, { from: week, to: weekEnd(week) }, today, false);
  const showFinance = can(user.role, "finance.read");
  const saved = snapshot.weeklyReviews.find((row) => row.week_start === week);
  const history = snapshot.weeklyReviews.slice().sort((a, b) => b.week_start.localeCompare(a.week_start));
  return (
    <>
      <PageHeader
        eyebrow="Weekly Review"
        title="周复盘"
        description={`${week} 至 ${weekEnd(week)}。左边的数字按这一周从底表重算，改历史数据后会跟着变。`}
        action={
          <span className="flex gap-3 text-sm">
            <Link className="underline" href={`/weekly-review?week=${addDays(week, -7)}`}>上一周</Link>
            <Link className="underline" href={`/weekly-review?week=${addDays(week, 7)}`}>下一周</Link>
          </span>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="新增询盘" value={formatInt(model.kpis.inquiries)} hint={`有效 ${formatInt(model.kpis.validInquiries)}`} />
        {showFinance ? <Kpi label="北极星" value={formatInt(model.kpis.northStar)} hint={`有效付费 ${formatInt(model.kpis.paidOrders)}`} /> : null}
        {showFinance ? <Kpi label="净销售额" value={formatUsdCents(model.kpis.netSalesCents)} hint={`收款 ${formatUsdCents(model.kpis.cashCollectedCents)}`} /> : null}
        <Kpi label="广告花费" value={formatUsdCents(model.kpis.adSpendCents)} hint={showFinance ? `广告前利润 ${formatUsdCents(model.kpis.profitBeforeCents)}` : "组合层花费"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <Panel title="七个问题">
          <WeeklyForm weekStart={week} answers={saved?.answers ?? empty} canWrite={can(user.role, "reviews.write")} />
        </Panel>
        <Panel title="历史">
          {history.length === 0 ? <p className="text-sm text-muted-foreground">还没有保存过的周复盘。</p> : (
            <ul className="grid gap-2 text-sm">
              {history.map((row) => (
                <li key={row.id}>
                  <Link className="underline" href={`/weekly-review?week=${row.week_start}`}>{row.week_start}</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
