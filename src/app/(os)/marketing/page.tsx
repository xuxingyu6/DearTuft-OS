import Link from "next/link";
import { Suspense } from "react";

import { removeAd, removePost } from "@/app/actions/marketing";
import { requireUser } from "@/lib/auth";
import { DemoBadge } from "@/components/badges";
import { EmptyState, PageHeader } from "@/components/bits";
import { AdForm, PostForm } from "@/components/record-forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shanghaiToday } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { CONTENT_TYPE_LABEL, PLATFORM_LABEL } from "@/lib/labels";
import { adMetrics } from "@/lib/metrics";
import { formatInt, formatPct, formatUsdCents } from "@/lib/money";
import { can } from "@/lib/permissions";
import { one } from "@/lib/query";

export default function MarketingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">正在读取营销…</p>}>
      <Marketing searchParams={searchParams} />
    </Suspense>
  );
}

async function Marketing({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const snapshot = await (await getDb()).loadSnapshot();
  const includeDemo = one(params, "demo") === "1";
  const ads = snapshot.ads.filter((row) => includeDemo || !row.is_demo).sort((a, b) => b.stat_date.localeCompare(a.stat_date));
  const posts = snapshot.posts.filter((row) => includeDemo || !row.is_demo).sort((a, b) => b.published_on.localeCompare(a.published_on));
  const writable = can(user.role, "marketing.write");
  const editingAd = ads.find((row) => row.id === one(params, "ad"));
  const editingPost = posts.find((row) => row.id === one(params, "post"));
  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="营销"
        description="每日广告是组合层花费。分母为 0 时指标显示为 —。内容上的询盘和订单是手填，不会回写到客户利润。"
        action={<Link href={includeDemo ? "/marketing" : "/marketing?demo=1"} className="text-sm underline">{includeDemo ? "隐藏 Demo" : "显示 Demo"}</Link>}
      />
      <Tabs defaultValue={one(params, "tab") === "posts" ? "posts" : "ads"}>
        <TabsList>
          <TabsTrigger value="ads">每日广告</TabsTrigger>
          <TabsTrigger value="posts">内容</TabsTrigger>
        </TabsList>
        <TabsContent value="ads" className="grid gap-4">
          {writable ? (
            <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <AdForm ad={editingAd} today={shanghaiToday()} />
            </div>
          ) : <p className="text-sm text-muted-foreground">客服可以看广告，不能改。内容角色和创始人可以录入。</p>}
          {ads.length === 0 ? <EmptyState title="还没有广告日数据" body="加一行之后，总览的花费、CTR 和混合 CAC 会按日期变化。" /> : (
            <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">日期</th>
                    <th className="px-3 py-2 text-right font-medium">花费</th>
                    <th className="px-3 py-2 text-right font-medium">CPM</th>
                    <th className="px-3 py-2 text-right font-medium">CPC</th>
                    <th className="px-3 py-2 text-right font-medium">CTR</th>
                    <th className="px-3 py-2 text-right font-medium">询盘成本</th>
                    <th className="px-3 py-2 text-right font-medium">有效询盘成本</th>
                    <th className="px-3 py-2 text-right font-medium">CAC</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => {
                    const metrics = adMetrics(ad);
                    return (
                      <tr key={ad.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          {ad.stat_date} · {PLATFORM_LABEL[ad.platform]}
                          <div className="text-xs text-muted-foreground">{ad.campaign_name || "未命名活动"} / {ad.creative_name || "未命名素材"} {ad.is_demo ? <DemoBadge /> : null}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(ad.spend_usd_cents)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(metrics.cpmCents == null ? null : Math.round(metrics.cpmCents))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(metrics.cpcCents == null ? null : Math.round(metrics.cpcCents))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatPct(metrics.ctr)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(metrics.costPerInquiryCents == null ? null : Math.round(metrics.costPerInquiryCents))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(metrics.costPerValidCents == null ? null : Math.round(metrics.costPerValidCents))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatUsdCents(metrics.cacCents == null ? null : Math.round(metrics.cacCents))}</td>
                        <td className="px-3 py-2 text-right">
                          {writable ? (
                            <span className="flex justify-end gap-2 text-xs">
                              <Link className="underline" href={`/marketing?ad=${ad.id}${includeDemo ? "&demo=1" : ""}`}>编辑</Link>
                              <form action={removeAd}>
                                <input type="hidden" name="id" value={ad.id} />
                                <button className="text-destructive underline" type="submit">删除</button>
                              </form>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="posts" className="grid gap-4">
          {writable ? (
            <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <PostForm post={editingPost} today={shanghaiToday()} />
            </div>
          ) : null}
          {posts.length === 0 ? <EmptyState title="还没有内容" body="同一条素材发到不同平台，请各记一行。" /> : (
            <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">内容</th>
                    <th className="px-3 py-2 text-right font-medium">播放</th>
                    <th className="px-3 py-2 text-right font-medium">赞 / 评</th>
                    <th className="px-3 py-2 text-right font-medium">有效询盘</th>
                    <th className="px-3 py-2 text-right font-medium">订单</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{post.title}</div>
                        <div className="text-xs text-muted-foreground">{post.published_on} · {PLATFORM_LABEL[post.platform]} · {CONTENT_TYPE_LABEL[post.content_type]} {post.is_demo ? <DemoBadge /> : null}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatInt(post.views)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatInt(post.likes)} / {formatInt(post.comments)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatInt(post.valid_inquiries)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatInt(post.orders_count)}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        {writable ? (
                          <span className="flex justify-end gap-2">
                            <Link className="underline" href={`/marketing?tab=posts&post=${post.id}`}>编辑</Link>
                            <form action={removePost}>
                              <input type="hidden" name="id" value={post.id} />
                              <button className="text-destructive underline" type="submit">删除</button>
                            </form>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
