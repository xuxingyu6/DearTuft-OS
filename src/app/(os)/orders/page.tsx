import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { DemoBadge, OrderBadge } from "@/components/badges";
import { EmptyState, PageHeader, Select } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/lib/db";
import { orderFinance } from "@/lib/finance";
import { ORDER_STATUS_LABEL, PRODUCT_LABEL } from "@/lib/labels";
import { formatUsdCents } from "@/lib/money";
import { can } from "@/lib/permissions";
import { operationalSnapshot } from "@/lib/metrics";
import { one } from "@/lib/query";
import { ORDER_STATUSES } from "@/lib/types";

export default function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在读取订单…</p>}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!can(user.role, "orders.read")) {
    return <PageHeader eyebrow="Orders" title="订单不对内容角色开放" description="广告和内容在 Marketing。订单金额、成本和利润只给创始人和客服。" />;
  }
  const params = await searchParams;
  const includeDemo = one(params, "demo") === "1";
  const snapshot = operationalSnapshot(await (await getDb()).loadSnapshot(), includeDemo);
  const q = one(params, "q").toLowerCase();
  const status = one(params, "status");
  const names = new Map(snapshot.customers.map((customer) => [customer.id, customer.name]));
  const rows = snapshot.orders
    .filter((order) => !status || order.status === status)
    .filter((order) => {
      if (!q) return true;
      return `${order.order_number} ${names.get(order.customer_id) ?? ""}`.toLowerCase().includes(q);
    })
    .sort((a, b) => b.order_date.localeCompare(a.order_date));
  return (
    <>
      <PageHeader
        eyebrow="Orders"
        title="订单"
        description="净销售额、已收款、未收余额分开算。利润用订单保存时的汇率，不把广告费平均摊进来。"
        action={<Link href="/orders/new"><Button>新建订单</Button></Link>}
      />
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={one(params, "q")} placeholder="订单号或客户" className="w-48" />
        <Select name="status" defaultValue={status} className="w-40">
          <option value="">全部状态</option>
          {ORDER_STATUSES.map((item) => <option key={item} value={item}>{ORDER_STATUS_LABEL[item]}</option>)}
        </Select>
        {includeDemo ? <input type="hidden" name="demo" value="1" /> : null}
        <Button type="submit" variant="outline">筛选</Button>
        <Link href={includeDemo ? "/orders" : "/orders?demo=1"} className="text-sm underline">{includeDemo ? "隐藏 Demo" : "显示 Demo"}</Link>
      </form>
      {rows.length === 0 ? <EmptyState title="没有订单" body="从客户页或这里新建。定金和尾款在订单里逐笔记。" /> : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">订单</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 text-right font-medium">净销售额</th>
                <th className="px-3 py-2 text-right font-medium">已收款</th>
                <th className="px-3 py-2 text-right font-medium">未收</th>
                <th className="px-3 py-2 text-right font-medium">广告前利润</th>
                <th className="px-3 py-2 font-medium">归因</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const finance = orderFinance(order, snapshot.payments, snapshot.costLines);
                return (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">{order.order_number}</Link>
                      <div className="text-xs text-muted-foreground">{names.get(order.customer_id)} · {order.order_date} · {PRODUCT_LABEL[order.product_code]}</div>
                      {order.is_demo ? <DemoBadge /> : null}
                    </td>
                    <td className="px-3 py-3"><OrderBadge status={order.status} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatUsdCents(finance.netSalesCents)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatUsdCents(finance.cashCollectedCents)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatUsdCents(finance.unpaidCents)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatUsdCents(finance.profitBeforeCents)}</td>
                    <td className="px-3 py-3 text-xs">{finance.attributedAdCents == null ? "未归因" : formatUsdCents(finance.attributedAdCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
