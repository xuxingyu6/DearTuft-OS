import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { removeCostLine, removePayment } from "@/app/actions/orders";
import { requireUser } from "@/lib/auth";
import { DemoBadge, OrderBadge } from "@/components/badges";
import { Kpi, PageHeader, Panel } from "@/components/bits";
import { OrderForm } from "@/components/order-form";
import { CostForm, PaymentForm } from "@/components/record-forms";
import { shanghaiToday } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { orderFinance } from "@/lib/finance";
import { COST_CATEGORY_LABEL, PAYMENT_KIND_LABEL } from "@/lib/labels";
import { cnyFenToUsdCents, formatCnyFen, formatFx, formatPct, formatUsdCents } from "@/lib/money";
import { can } from "@/lib/permissions";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在打开订单…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!can(user.role, "orders.read")) {
    return <PageHeader eyebrow="Orders" title="没有权限" description="订单财务只对创始人和客服开放。" />;
  }
  const { id } = await params;
  const snapshot = await (await getDb()).loadSnapshot();
  const order = snapshot.orders.find((row) => row.id === id);
  if (!order) notFound();
  const customer = snapshot.customers.find((row) => row.id === order.customer_id);
  const finance = orderFinance(order, snapshot.payments, snapshot.costLines);
  const payments = snapshot.payments.filter((row) => row.order_id === id);
  const lines = snapshot.costLines.filter((row) => row.order_id === id);
  const writable = can(user.role, "orders.write");
  return (
    <>
      <PageHeader
        eyebrow="Orders"
        title={order.order_number}
        description={`${customer?.name ?? "未知客户"} · 汇率快照 ${formatFx(order.fx_cny_per_usd_e6)}`}
        action={<span className="flex items-center gap-2">{order.is_demo ? <DemoBadge /> : null}<OrderBadge status={order.status} /></span>}
      />
      {!finance.includedInRevenue ? <p className="mb-4 text-sm text-amber-800">这张订单已取消，不计入总览的销售额和利润。</p> : null}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="净销售额" value={formatUsdCents(finance.netSalesCents)} hint="应付 − 退款" />
        <Kpi label="累计收款" value={formatUsdCents(finance.cashCollectedCents)} hint={`已收 ${formatUsdCents(finance.receiptCents)}，退款 ${formatUsdCents(finance.refundCents)}`} />
        <Kpi label="未收余额" value={formatUsdCents(finance.unpaidCents)} hint="应付 − 已收。退款不加回未收。" />
        <Kpi label="广告前利润" value={formatUsdCents(finance.profitBeforeCents)} hint={finance.validPaid ? (finance.positiveContribution ? "计入北极星" : "有效付费，但利润不为正") : "还不是有效付费订单"} />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Kpi label="约定定金" value={formatUsdCents(order.agreed_deposit_usd_cents)} hint={`定金及全款到账 ${formatUsdCents(finance.depositPaidCents)}`} />
        <Kpi label="扣归因后利润" value={finance.profitAfterAttributedCents == null ? "未归因" : formatUsdCents(finance.profitAfterAttributedCents)} hint={finance.marginAfter == null ? "没有订单级广告归因，不会用组合花费去摊" : `利润率 ${formatPct(finance.marginAfter)}`} />
        <Kpi label="可变成本（美元）" value={formatUsdCents(finance.variableUsdCents)} hint={`制作 ${formatUsdCents(finance.productionUsdCents)} · 物流 ${formatUsdCents(finance.shippingUsdCents)} · 手续费 ${formatUsdCents(finance.paymentFeeUsdCents)}`} />
      </div>
      <p className="mb-6 text-xs leading-5 text-muted-foreground">
        制作成本 {formatCnyFen(order.production_cost_cny_fen)} ≈ {formatUsdCents(cnyFenToUsdCents(order.production_cost_cny_fen, order.fx_cny_per_usd_e6))}。
        有效付费 = 已确认且未取消/未整单退款，并且已付全款或已付约定定金。
        {customer ? <Link className="ml-2 underline" href={`/customers/${customer.id}`}>回到客户</Link> : null}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="收款与退款">
          {payments.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">还没有到账记录。约定定金本身不算收款。</p> : (
            <ul className="mb-4 grid gap-2 text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-2">
                  <span>{payment.paid_on} · {PAYMENT_KIND_LABEL[payment.kind]} · {formatUsdCents(payment.amount_usd_cents)}</span>
                  {writable ? (
                    <form action={removePayment}>
                      <input type="hidden" name="id" value={payment.id} />
                      <input type="hidden" name="order_id" value={id} />
                      <button className="text-xs text-destructive underline" type="submit">删除</button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {writable ? <PaymentForm orderId={id} today={shanghaiToday()} /> : null}
        </Panel>
        <Panel title="追加费用 / 归因广告">
          <p className="mb-3 text-xs leading-5 text-muted-foreground">订单上的制作、物流、手续费、其他成本是主成本。这里是追加项。归因广告只在有把握时填写，系统不会把每日广告花费平均分过来。</p>
          {lines.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">没有追加费用。这张订单的广告成本显示为未归因。</p> : (
            <ul className="mb-4 grid gap-2 text-sm">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-2">
                  <span>{COST_CATEGORY_LABEL[line.category]} · {line.currency === "USD" ? formatUsdCents(line.amount_minor) : formatCnyFen(line.amount_minor)}{line.note ? ` · ${line.note}` : ""}</span>
                  {writable ? (
                    <form action={removeCostLine}>
                      <input type="hidden" name="id" value={line.id} />
                      <input type="hidden" name="order_id" value={id} />
                      <button className="text-xs text-destructive underline" type="submit">删除</button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {writable ? <CostForm orderId={id} /> : null}
        </Panel>
      </div>
      {writable ? (
        <div className="mt-6 rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-6">
          <h2 className="mb-4 text-sm font-medium">修改订单</h2>
          <OrderForm
            order={order}
            currentFxE6={snapshot.fxE6}
            customers={snapshot.customers.map((item) => ({ id: item.id, name: item.name, isDemo: item.is_demo }))}
          />
        </div>
      ) : null}
    </>
  );
}
