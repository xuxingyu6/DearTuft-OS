import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { Kpi, PageHeader, Panel } from "@/components/bits";
import { MonthlyForm } from "@/components/record-forms";
import { getDb } from "@/lib/db";
import { addMonths, isYmd, monthEnd, monthKey, monthStart, shanghaiToday } from "@/lib/dates";
import { formatInt, formatUsdCents } from "@/lib/money";
import { computeDashboard, scopeSnapshot } from "@/lib/metrics";
import { can } from "@/lib/permissions";
import { one } from "@/lib/query";
import type { MonthlyAnswers } from "@/lib/types";

const empty: MonthlyAnswers = { what_worked: "", what_failed: "", blockers: "", next_focus: "", notes: "" };

export default function MonthlyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在对比两个月…</p>}>
      <Monthly searchParams={searchParams} />
    </Suspense>
  );
}

async function Monthly({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const today = shanghaiToday();
  const requested = one(params, "month");
  const start = isYmd(`${requested}-01`) ? `${requested}-01` : monthStart(today);
  const previous = monthStart(addMonths(start, -1));
  const snapshot = scopeSnapshot(await (await getDb()).loadSnapshot(), user.role);
  const showFinance = can(user.role, "finance.read");
  const current = computeDashboard(snapshot, { from: start, to: monthEnd(start) }, today, false);
  const last = computeDashboard(snapshot, { from: previous, to: monthEnd(previous) }, today, false);
  const saved = snapshot.monthlyReviews.find((row) => row.month_start === start);
  const history = snapshot.monthlyReviews.slice().sort((a, b) => b.month_start.localeCompare(a.month_start));
  const rows: [string, number, number][] = [
    ["新增询盘", current.kpis.inquiries, last.kpis.inquiries],
    ["有效询盘", current.kpis.validInquiries, last.kpis.validInquiries],
  ];
  if (showFinance) {
    rows.push(
      ["北极星", current.kpis.northStar, last.kpis.northStar],
      ["有效付费订单", current.kpis.paidOrders, last.kpis.paidOrders],
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Monthly Review"
        title={`${monthKey(start)} 月复盘`}
        description="和上月整月对比。目标在 Settings，进度在总览侧栏，这里看发生了什么。"
        action={
          <span className="flex gap-3 text-sm">
            <Link className="underline" href={`/monthly-review?month=${monthKey(previous)}`}>上个月</Link>
            <Link className="underline" href={`/monthly-review?month=${monthKey(addMonths(start, 1))}`}>下个月</Link>
          </span>
        }
      />
      <div className="mb-6 overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">指标</th>
              <th className="px-3 py-2 text-right font-medium">本月</th>
              <th className="px-3 py-2 text-right font-medium">上月</th>
              <th className="px-3 py-2 text-right font-medium">变化</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, now, before]) => (
              <tr key={label} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatInt(now)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatInt(before)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{delta(now, before)}</td>
              </tr>
            ))}
            <MoneyRow label="广告花费" now={current.kpis.adSpendCents} before={last.kpis.adSpendCents} />
            {showFinance ? <MoneyRow label="净销售额" now={current.kpis.netSalesCents} before={last.kpis.netSalesCents} /> : null}
            {showFinance ? <MoneyRow label="广告前利润" now={current.kpis.profitBeforeCents} before={last.kpis.profitBeforeCents} /> : null}
          </tbody>
        </table>
      </div>
      {showFinance ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Kpi label="本月目标" value={snapshot.targets[monthKey(start)] == null ? "未设" : formatInt(snapshot.targets[monthKey(start)])} hint="北极星订单数" />
          <Kpi label="本月收款" value={formatUsdCents(current.kpis.cashCollectedCents)} hint="按到账日" />
          <Kpi label="本月未收" value={formatUsdCents(current.kpis.unpaidCents)} hint="本月订单的未收余额" />
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Panel title="人工复盘">
          <MonthlyForm monthStart={start} answers={saved?.answers ?? empty} canWrite={can(user.role, "reviews.write")} />
        </Panel>
        <Panel title="历史">
          {history.length === 0 ? <p className="text-sm text-muted-foreground">还没有月复盘。</p> : (
            <ul className="grid gap-2 text-sm">
              {history.map((row) => (
                <li key={row.id}><Link className="underline" href={`/monthly-review?month=${monthKey(row.month_start)}`}>{monthKey(row.month_start)}</Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function delta(now: number, before: number) {
  const diff = now - before;
  if (diff === 0) return "0";
  return diff > 0 ? `+${diff}` : String(diff);
}

function MoneyRow({ label, now, before }: { label: string; now: number; before: number }) {
  const diff = now - before;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(now)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(before)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{diff === 0 ? formatUsdCents(0) : `${diff > 0 ? "+" : "−"}${formatUsdCents(Math.abs(diff))}`}</td>
    </tr>
  );
}
