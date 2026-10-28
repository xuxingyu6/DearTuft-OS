import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth";
import { DemoBadge, StageBadge } from "@/components/badges";
import { EmptyState, PageHeader, Select } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/lib/db";
import { displayInstagram } from "@/lib/instagram";
import { PLATFORM_LABEL, PRODUCT_LABEL, STAGE_LABEL } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { operationalSnapshot } from "@/lib/metrics";
import { one } from "@/lib/query";
import { shanghaiToday } from "@/lib/dates";
import { PLATFORMS, PRODUCTS, STAGES, type Customer, type FollowUp, type Snapshot } from "@/lib/types";

export default function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在读取客户…</p>}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const includeDemo = one(params, "demo") === "1";
  const snapshot = operationalSnapshot(await (await getDb()).loadSnapshot(), includeDemo);
  const today = shanghaiToday();
  const rows = sortCustomers(filterCustomers(snapshot, params), snapshot.followUps, one(params, "sort") || "follow", today);
  const writable = can(user.role, "customers.write");
  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="客户"
        description="一个 Instagram 账号只建一份档案。询盘和订单分开记，避免把同一个人的多次咨询算成多个客户。"
        action={writable ? <Link href="/customers/new"><Button>新建客户</Button></Link> : null}
      />
      <form method="get" className="mb-4 grid gap-2 md:grid-cols-6">
        <Input name="q" defaultValue={one(params, "q")} placeholder="搜索姓名、账号、国家" className="md:col-span-2" />
        <Select name="stage" defaultValue={one(params, "stage")}>
          <option value="">全部阶段</option>
          {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABEL[stage]}</option>)}
        </Select>
        <Select name="platform" defaultValue={one(params, "platform")}>
          <option value="">全部平台</option>
          {PLATFORMS.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABEL[platform]}</option>)}
        </Select>
        <Select name="product" defaultValue={one(params, "product")}>
          <option value="">全部产品</option>
          {PRODUCTS.map((product) => <option key={product} value={product}>{PRODUCT_LABEL[product]}</option>)}
        </Select>
        <Select name="sort" defaultValue={one(params, "sort") || "follow"}>
          <option value="follow">按下次跟进</option>
          <option value="updated">最近更新</option>
          <option value="created">最近创建</option>
          <option value="name">姓名</option>
        </Select>
        <Input name="country" defaultValue={one(params, "country")} placeholder="国家" />
        {includeDemo ? <input type="hidden" name="demo" value="1" /> : null}
        <Button type="submit" variant="outline">筛选</Button>
        <Link href={includeDemo ? "/customers" : "/customers?demo=1"} className="self-center text-sm underline">
          {includeDemo ? "隐藏 Demo" : "显示 Demo"}
        </Link>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="没有符合条件的客户" body={writable ? "新建第一位客户，或放宽筛选。" : "内容角色可以查看，不能新建。"} action={writable ? <Link href="/customers/new" className="text-sm underline">新建客户</Link> : null} />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">客户</th>
                <th className="px-3 py-2 font-medium">阶段</th>
                <th className="px-3 py-2 font-medium">国家 / 平台</th>
                <th className="px-3 py-2 font-medium">产品</th>
                <th className="px-3 py-2 font-medium">下次跟进</th>
                <th className="px-3 py-2 font-medium">意向</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.customer.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">
                    <Link href={`/customers/${row.customer.id}`} className="font-medium hover:underline">{row.customer.name}</Link>
                    <div className="text-xs text-muted-foreground">{displayInstagram(row.customer.instagram_handle)}</div>
                    {row.customer.is_demo ? <DemoBadge /> : null}
                  </td>
                  <td className="px-3 py-3"><StageBadge stage={row.customer.stage} /></td>
                  <td className="px-3 py-3">
                    {row.customer.country || "—"}
                    <div className="text-xs text-muted-foreground">{row.customer.acquisition_platform ? PLATFORM_LABEL[row.customer.acquisition_platform] : "未归因"}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">{row.customer.interested_products.map((product) => PRODUCT_LABEL[product]).join("、") || "—"}</td>
                  <td className={row.overdue ? "px-3 py-3 text-rose-700" : "px-3 py-3"}>{row.next ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{row.customer.latest_intent || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function filterCustomers(snapshot: Snapshot, params: Record<string, string | string[] | undefined>) {
  const q = one(params, "q").toLowerCase();
  const stage = one(params, "stage");
  const platform = one(params, "platform");
  const product = one(params, "product");
  const country = one(params, "country").toLowerCase();
  return snapshot.customers.filter((customer) => {
    if (stage && customer.stage !== stage) return false;
    if (platform && customer.acquisition_platform !== platform) return false;
    if (product && !customer.interested_products.includes(product as Customer["interested_products"][number])) return false;
    if (country && !(customer.country ?? "").toLowerCase().includes(country)) return false;
    if (!q) return true;
    const hay = [customer.name, customer.instagram_handle, customer.tiktok_handle, customer.contact, customer.country, customer.notes].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function sortCustomers(customers: Customer[], followUps: FollowUp[], sort: string, today: string) {
  const nextOf = (id: string) =>
    followUps
      .filter((row) => row.customer_id === id && !row.completed && row.next_follow_up_on)
      .map((row) => row.next_follow_up_on as string)
      .sort()[0] ?? null;
  const rows = customers.map((customer) => {
    const next = nextOf(customer.id);
    return { customer, next, overdue: Boolean(next && next < today) };
  });
  rows.sort((a, b) => {
    if (sort === "name") return a.customer.name.localeCompare(b.customer.name, "zh");
    if (sort === "created") return b.customer.created_at.localeCompare(a.customer.created_at);
    if (sort === "updated") return b.customer.updated_at.localeCompare(a.customer.updated_at);
    if (!a.next && !b.next) return b.customer.updated_at.localeCompare(a.customer.updated_at);
    if (!a.next) return 1;
    if (!b.next) return -1;
    return a.next.localeCompare(b.next);
  });
  return rows;
}
