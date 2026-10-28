import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { removeCustomer, removeFollowUp, removeInquiry, toggleFollowUp, toggleInquiry } from "@/app/actions/crm";
import { requireUser } from "@/lib/auth";
import { DemoBadge, StageBadge, lostLabel } from "@/components/badges";
import { PageHeader, Panel } from "@/components/bits";
import { CustomerForm } from "@/components/customer-form";
import { FollowUpForm, InquiryForm } from "@/components/record-forms";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/db";
import { displayInstagram } from "@/lib/instagram";
import { PLATFORM_LABEL, PRODUCT_LABEL, STAGE_LABEL } from "@/lib/labels";
import { formatUsdCents } from "@/lib/money";
import { can } from "@/lib/permissions";
import { orderFinance } from "@/lib/finance";
import { scopeSnapshot } from "@/lib/metrics";
import { shanghaiDate, shanghaiToday } from "@/lib/dates";
import type { Customer } from "@/lib/types";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在打开客户…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const snapshot = scopeSnapshot(await (await getDb()).loadSnapshot(), user.role);
  const customer = snapshot.customers.find((row) => row.id === id);
  if (!customer) notFound();
  const today = shanghaiToday();
  const writable = can(user.role, "customers.write");
  const showOrders = can(user.role, "orders.read");
  const inquiries = snapshot.inquiries.filter((row) => row.customer_id === id).sort((a, b) => b.inquiry_date.localeCompare(a.inquiry_date));
  const follows = snapshot.followUps.filter((row) => row.customer_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const history = snapshot.statusHistory.filter((row) => row.customer_id === id).sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  const orders = snapshot.orders.filter((row) => row.customer_id === id);
  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title={customer.name}
        description={`${displayInstagram(customer.instagram_handle)} · ${customer.country || "国家未填"}`}
        action={
          <div className="flex items-center gap-2">
            {customer.is_demo ? <DemoBadge /> : null}
            <StageBadge stage={customer.stage} />
            {showOrders ? <Link href={`/orders/new?customer=${customer.id}`}><Button variant="outline">新建订单</Button></Link> : null}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          <Panel title="档案">
            {writable ? <CustomerForm customer={customer} /> : <ReadOnly customer={customer} />}
          </Panel>
          <Panel title="询盘">
            {inquiries.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">还没有询盘。总览里的新增询盘只数这里，不数客户人数。</p> : (
              <ul className="mb-4 grid gap-2">
                {inquiries.map((inquiry) => (
                  <li key={inquiry.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{inquiry.inquiry_date} · {PLATFORM_LABEL[inquiry.platform]} · {inquiry.is_valid ? "有效" : "未标有效"}</span>
                      {writable ? (
                        <span className="flex gap-2">
                          <form action={toggleInquiry}>
                            <input type="hidden" name="id" value={inquiry.id} />
                            <input type="hidden" name="customer_id" value={id} />
                            <input type="hidden" name="is_valid" value={inquiry.is_valid ? "false" : "true"} />
                            <button className="underline" type="submit">{inquiry.is_valid ? "标为无效" : "标为有效"}</button>
                          </form>
                          <form action={removeInquiry}>
                            <input type="hidden" name="id" value={inquiry.id} />
                            <input type="hidden" name="customer_id" value={id} />
                            <button className="text-destructive underline" type="submit">删除</button>
                          </form>
                        </span>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground">{inquiry.product_interest || "未填产品"}{inquiry.notes ? ` · ${inquiry.notes}` : ""}</div>
                    <div className="text-xs text-muted-foreground">来源内容：{inquiry.source_content || "未归因"} · 广告：{inquiry.source_campaign || "未归因"}</div>
                  </li>
                ))}
              </ul>
            )}
            {writable ? <InquiryForm customerId={id} today={today} /> : null}
          </Panel>
          {showOrders ? (
            <Panel title="关联订单">
              {orders.length === 0 ? <p className="text-sm text-muted-foreground">还没有订单。</p> : (
                <ul className="grid gap-2 text-sm">
                  {orders.map((order) => {
                    const finance = orderFinance(order, snapshot.payments, snapshot.costLines);
                    return (
                      <li key={order.id}>
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline">{order.order_number}</Link>
                        <span className="ml-2 text-muted-foreground">{order.order_date} · 净销售 {formatUsdCents(finance.netSalesCents)} · 已收 {formatUsdCents(finance.cashCollectedCents)} · 未收 {formatUsdCents(finance.unpaidCents)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
        <div className="grid content-start gap-4">
          <Panel title="跟进">
            {follows.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">还没有跟进。</p> : (
              <ul className="mb-4 grid gap-2">
                {follows.map((row) => (
                  <li key={row.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <div className="font-medium">{row.completed ? "已完成" : "待办"} · {row.task}</div>
                    <div className="text-muted-foreground">{row.content || "没有沟通记录"}</div>
                    <div className="text-xs text-muted-foreground">下次 {row.next_follow_up_on || "未排期"}{row.latest_intent ? ` · ${row.latest_intent}` : ""}</div>
                    {writable ? (
                      <div className="mt-1 flex gap-3 text-xs">
                        <form action={toggleFollowUp}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="customer_id" value={id} />
                          <input type="hidden" name="completed" value={row.completed ? "false" : "true"} />
                          <button className="underline" type="submit">{row.completed ? "标为未完成" : "标为完成"}</button>
                        </form>
                        <form action={removeFollowUp}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="customer_id" value={id} />
                          <button className="text-destructive underline" type="submit">删除</button>
                        </form>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {writable ? <FollowUpForm customerId={id} today={today} /> : null}
          </Panel>
          <Panel title="阶段记录">
            <ul className="grid gap-2 text-sm">
              {history.map((event) => (
                <li key={event.id}>
                  <div>{shanghaiDate(event.changed_at)} · {event.from_stage ? STAGE_LABEL[event.from_stage] : "新建"} → {STAGE_LABEL[event.to_stage]}</div>
                  {event.lost_reason ? <div className="text-xs text-muted-foreground">{lostLabel(event.lost_reason, null)}</div> : null}
                </li>
              ))}
            </ul>
          </Panel>
          {writable ? (
            <form action={removeCustomer}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive">删除客户</Button>
              <p className="mt-2 text-xs text-muted-foreground">有订单时不能删。流失客户改阶段即可复活。</p>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ReadOnly({ customer }: { customer: Customer }) {
  return (
    <dl className="grid gap-2 text-sm md:grid-cols-2">
      <div>阶段：{STAGE_LABEL[customer.stage]}</div>
      <div>宠物：{customer.pet_type || "—"}</div>
      <div>预算：{formatUsdCents(customer.budget_usd_cents)}</div>
      <div>流失：{lostLabel(customer.lost_reason, customer.lost_reason_custom)}</div>
      <div className="md:col-span-2">备注：{customer.notes || "—"}</div>
    </dl>
  );
}
