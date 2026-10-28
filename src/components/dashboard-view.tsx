import Link from "next/link";

import { DemoBadge, OrderBadge } from "@/components/badges";
import { EmptyState, Kpi, Panel } from "@/components/bits";
import { HBar, SpendChart, TrendChart } from "@/components/charts";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { formatInt, formatPct, formatUsdCents } from "@/lib/money";
import type { DashboardModel } from "@/lib/metrics";

export function DashboardView({
  model,
  showOrders,
  preset,
  includeDemo,
}: {
  model: DashboardModel;
  showOrders: boolean;
  preset: string;
  includeDemo: boolean;
}) {
  const { kpis } = model;
  const demo = includeDemo ? "&demo=1" : "";
  const quiet = kpis.inquiries === 0 && kpis.orders === 0 && kpis.adSpendCents === 0 && kpis.posts === 0;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-6">
        {model.empty ? (
          <EmptyState
            title="还没有经营记录"
            body="总览上的数字全部来自客户、询盘、订单和广告表。先新建一个客户，补一条跟进，再建订单和一行广告，回到这里选本月，数字就会变。"
            action={
              <Link href="/customers/new" className="text-sm font-medium underline">
                去新建客户
              </Link>
            }
          />
        ) : null}
        <section className="grid gap-3">
          <h2 className="text-sm font-medium">流量与询盘</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="新增询盘" value={formatInt(kpis.inquiries)} hint={`${formatInt(kpis.inquiryCustomers)} 位客户`} />
            <Kpi label="有效询盘" value={formatInt(kpis.validInquiries)} hint={`${formatInt(kpis.validInquiryCustomers)} 位客户`} />
            <Kpi label="展示 / 点击" value={`${formatInt(kpis.impressions)} / ${formatInt(kpis.clicks)}`} hint={`CTR ${formatPct(kpis.ctr)}`} />
            <Kpi label="发布内容" value={formatInt(kpis.posts)} hint="按发布日" />
          </div>
        </section>
        {showOrders ? (
          <section className="grid gap-3">
            <h2 className="text-sm font-medium">成交表现</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="北极星" value={formatInt(kpis.northStar)} hint="有效付费且广告前利润为正" />
              <Kpi label="有效付费订单" value={formatInt(kpis.paidOrders)} hint={`${formatInt(kpis.paidCustomers)} 位付费客户`} />
              <Kpi label="已报价客户" value={formatInt(kpis.quotedCustomers)} hint="区间内进入已报价" />
              <Kpi label="交付 / 评价" value={`${formatInt(kpis.deliveredOrders)} / ${formatInt(kpis.reviewedOrders)}`} hint="订单数" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <RateCard title="当期有效询盘成交率" pair={model.validToPaid} note="分母是区间内有有效询盘的客户，分子是其中在同一区间产生有效付费订单的人。跨月成交看下面的同期群。" />
              <RateCard title="当期报价后成交率" pair={model.quotedToPaid} note="分母是区间内进入已报价的客户人数。订单数和客户数分开，避免把一单多件算成多人。" />
            </div>
          </section>
        ) : (
          <EmptyState title="成交和财务不对内容角色开放" body="你可以维护广告和内容。订单、收款和利润只有创始人和客服能看。" />
        )}
        {showOrders ? (
          <section className="grid gap-3">
            <h2 className="text-sm font-medium">财务</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Kpi label="净销售额" value={formatUsdCents(kpis.netSalesCents)} hint="按下单日。成交金额 − 优惠 − 退款。不含已取消。" />
              <Kpi label="本期收款" value={formatUsdCents(kpis.cashCollectedCents)} hint="按到账日的现金净额，含退款冲减。" />
              <Kpi label="本期订单未收" value={formatUsdCents(kpis.unpaidCents)} hint="这些订单的应付减去已收，退款不把未收加回去。" />
              <Kpi label="广告花费（组合）" value={formatUsdCents(kpis.adSpendCents)} hint="只加总每日广告表，不摊到订单。" />
              <Kpi label="广告前贡献利润" value={formatUsdCents(kpis.profitBeforeCents)} hint={kpis.marginBefore == null ? "净销售额为 0" : `利润率 ${formatPct(kpis.marginBefore)}`} />
              <Kpi label="扣归因广告后" value={formatUsdCents(kpis.profitAfterAttributedCents)} hint={`已归因 ${formatUsdCents(kpis.attributedAdCents)}。未归因组合花费 ${formatUsdCents(kpis.unattributedPortfolioCents)}，没有分摊。`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Kpi label="混合 CAC" value={formatUsdCents(kpis.blendedCacCents)} hint="组合花费 ÷ 有效付费订单。这不是归因 CAC。" />
              <Kpi
                label="归因 CAC"
                value={formatUsdCents(kpis.attributedCacCents)}
                hint={`${formatInt(kpis.attributedPaidOrders)} 单有归因，${formatInt(kpis.unattributedPaidOrders)} 单未归因。`}
              />
            </div>
            {kpis.attributionOverflow ? (
              <p className="text-sm text-amber-800">订单上填写的归因广告成本大于本期组合花费。两个数都照实显示，没有互相冲掉。</p>
            ) : null}
          </section>
        ) : null}
        <Panel title={showOrders ? "每日询盘与有效付费订单" : "每日询盘"}>
          {quiet ? <EmptyState title="这个区间没有询盘或订单" body="换一个日期，或先录入一条询盘和一张订单。" /> : <TrendChart showPaid={showOrders} data={model.series.map((point) => ({ date: point.date, inquiries: point.inquiries, paidOrders: point.paidOrders }))} />}
        </Panel>
        <Panel title="每日广告花费">
          {kpis.adSpendCents === 0 && model.series.every((point) => point.adSpendCents === 0) ? (
            <EmptyState title="这个区间没有广告花费" body="到 Marketing 加一行每日广告后，这里和上面的花费会一起变。花费为 0 时 CPM、CPC 显示为破折号，不会报错。" />
          ) : (
            <SpendChart data={model.series.map((point) => ({ date: point.date, spend: point.adSpendCents }))} />
          )}
        </Panel>
        {showOrders ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="漏斗（当期事件，不要求同一个人走完）">
              <ol className="grid gap-2">
                {model.funnel.map((step) => (
                  <li key={step.key} className="rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{step.label}</span>
                      <span className="text-sm tabular-nums">
                        {formatInt(step.count)} 条 · {formatInt(step.people)} 人
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.hint}</p>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="渠道、产品、未成交原因">
              <h3 className="mb-2 text-xs text-muted-foreground">询盘渠道</h3>
              <HBar data={model.channels.map((item) => ({ label: item.label, count: item.count }))} />
              <h3 className="mt-4 mb-2 text-xs text-muted-foreground">产品净销售额</h3>
              {model.products.length === 0 ? <p className="text-sm text-muted-foreground">还没有计入的订单。</p> : (
                <ul className="grid gap-1 text-sm">
                  {model.products.map((item) => (
                    <li key={item.key} className="flex justify-between gap-3">
                      <span>{item.label} · {item.orders} 单</span>
                      <span className="tabular-nums">{formatUsdCents(item.netSalesCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <h3 className="mt-4 mb-2 text-xs text-muted-foreground">流失原因（区间内进入已流失的客户）</h3>
              <HBar data={model.lostReasons.map((item) => ({ label: item.label, count: item.count }))} />
            </Panel>
          </div>
        ) : null}
        {showOrders ? <Panel title="同期群：首次询盘 → 付款">
          <p className="mb-3 text-sm text-muted-foreground">
            只看首次询盘日落在所选区间的客户。30/60 天成交率只统计窗口已经走完的人，避免把还没到期的客户算成失败。
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="同期群人数" value={formatInt(model.cohort.customers)} hint={`至今已有有效付款 ${formatInt(model.cohort.paidSoFar)} 人`} />
            <Kpi label="30 天成交率" value={formatPct(model.cohort.rate30)} hint={model.cohort.closed30 ? `${model.cohort.paid30}/${model.cohort.closed30} 人窗口已关闭` : "窗口都还没结束"} />
            <Kpi label="60 天成交率" value={formatPct(model.cohort.rate60)} hint={model.cohort.closed60 ? `${model.cohort.paid60}/${model.cohort.closed60} 人窗口已关闭` : "窗口都还没结束"} />
          </div>
        </Panel> : null}
      </div>
      <aside className="grid content-start gap-4">
        {showOrders ? (
          <Panel title="本月北极星进度" action={<Link className="text-xs underline" href={`/?preset=month${demo}`}>看本月</Link>}>
            <div className="text-2xl font-semibold tabular-nums">
              {formatInt(model.monthTarget.northStar)}
              <span className="text-base font-normal text-muted-foreground"> / {model.monthTarget.target == null ? "未设目标" : formatInt(model.monthTarget.target)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {model.monthTarget.month}，按上海日期的当月，不随左侧区间变化。有效付费订单 {formatInt(model.monthTarget.validPaid)}，其中利润为正的计入北极星。
            </p>
            {model.monthTarget.target ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (model.monthTarget.northStar / model.monthTarget.target) * 100)}%` }}
                />
              </div>
            ) : null}
            {preset !== "month" ? <p className="mt-2 text-xs text-muted-foreground">左侧卡片仍是你选的日期区间。</p> : null}
          </Panel>
        ) : null}
        {showOrders ? (
          <Panel title="今天要跟进">
            <FollowList items={model.followUpsToday} empty="今天没有到期跟进。" />
          </Panel>
        ) : null}
        {showOrders ? (
          <Panel title="逾期跟进">
            <FollowList items={model.followUpsOverdue} empty="没有逾期跟进。" />
          </Panel>
        ) : null}
        {showOrders ? (
          <Panel title="最近订单" action={<Link className="text-xs underline" href="/orders">全部</Link>}>
            {model.recentOrders.length === 0 ? <p className="text-sm text-muted-foreground">还没有订单。</p> : (
              <ul className="grid gap-2">
                {model.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/orders/${order.id}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
                      <span>
                        {order.orderNumber}
                        <span className="ml-2 text-muted-foreground">{order.customerName}</span>
                      </span>
                      <span className="tabular-nums">{formatUsdCents(order.netSalesCents)}</span>
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <OrderBadge status={order.status} />
                      {order.isDemo ? <DemoBadge /> : null}
                      <span className="text-xs text-muted-foreground">{ORDER_STATUS_LABEL[order.status] ? order.orderDate : order.orderDate}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}

function RateCard({ title, pair, note }: { title: string; pair: { num: number; den: number; rate: number | null }; note: string }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{formatPct(pair.rate)}</div>
      <div className="text-sm tabular-nums">{pair.den ? `${pair.num}/${pair.den} 人` : "还没有分母"}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function FollowList({ items, empty }: { items: DashboardModel["followUpsToday"]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/customers/${item.customerId}`} className="text-sm font-medium hover:underline">
            {item.customerName}
          </Link>
          <div className="text-xs text-muted-foreground">{item.nextOn} · {item.task}</div>
        </li>
      ))}
    </ul>
  );
}
