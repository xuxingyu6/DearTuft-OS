import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/bits";
import { shanghaiToday } from "@/lib/dates";
import { can } from "@/lib/permissions";

export default function NewCustomerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在打开表单…</p>}>
      <NewCustomer />
    </Suspense>
  );
}

async function NewCustomer() {
  const user = await requireUser();
  if (!can(user.role, "customers.write")) {
    return <PageHeader eyebrow="Customers" title="不能新建客户" description="内容角色只能查看客户，不能改档案。" />;
  }
  return (
    <>
      <PageHeader eyebrow="Customers" title="新建客户" description="Instagram 会按去掉 @、小写后查重。来源不清楚就留空。" />
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-6">
        <CustomerForm today={shanghaiToday()} />
      </div>
    </>
  );
}
