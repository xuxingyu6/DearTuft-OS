import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/bits";
import { OrderForm } from "@/components/order-form";
import { getDb } from "@/lib/db";
import { shanghaiToday } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { one } from "@/lib/query";

export default function NewOrderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在打开订单…</p>}>
      <NewOrder searchParams={searchParams} />
    </Suspense>
  );
}

async function NewOrder({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!can(user.role, "orders.write")) {
    return <PageHeader eyebrow="Orders" title="不能新建订单" description="只有创始人和客服可以记订单。" />;
  }
  const params = await searchParams;
  const snapshot = await (await getDb()).loadSnapshot();
  if (snapshot.customers.length === 0) {
    return <EmptyState title="先有客户，才能有订单" body="订单必须挂在客户上。" />;
  }
  return (
    <>
      <PageHeader eyebrow="Orders" title="新建订单" description="保存时写入当前汇率快照。收款请在保存后的订单页逐笔记，定金不是已收现金。" />
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <OrderForm
          currentFxE6={snapshot.fxE6}
          today={shanghaiToday()}
          presetCustomerId={one(params, "customer")}
          customers={snapshot.customers.map((customer) => ({ id: customer.id, name: customer.name, isDemo: customer.is_demo }))}
        />
      </div>
    </>
  );
}
