"use client";

import { addFollowUp, addInquiry } from "@/app/actions/crm";
import { saveAd, savePost } from "@/app/actions/marketing";
import { addCostLine, addPayment } from "@/app/actions/orders";
import { saveMonthlyReview, saveWeeklyReview } from "@/app/actions/reviews";
import { saveRole, saveSettings } from "@/app/actions/settings";
import { BindForm } from "@/components/bind-form";
import { Field, Select } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_TYPE_LABEL,
  COST_CATEGORY_LABEL,
  PAYMENT_KIND_LABEL,
  PLATFORM_LABEL,
  ROLE_LABEL,
  WEEKLY_QUESTIONS,
} from "@/lib/labels";
import { centsToInput, formatFx } from "@/lib/money";
import {
  CONTENT_TYPES,
  COST_CATEGORIES,
  CURRENCIES,
  PAYMENT_KINDS,
  PLATFORMS,
  ROLES,
  type AdStat,
  type ContentPost,
  type MonthlyAnswers,
  type Profile,
  type WeeklyAnswers,
} from "@/lib/types";

export function InquiryForm({ customerId, today = "" }: { customerId: string; today?: string }) {
  return (
    <BindForm action={addInquiry} className="grid gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="customer_id" value={customerId} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="询盘日期">
              <Input type="date" name="inquiry_date" required defaultValue={today} />
            </Field>
            <Field label="平台">
              <Select name="inquiry_platform" defaultValue="ig">
                {PLATFORMS.map((item) => (
                  <option key={item} value={item}>{PLATFORM_LABEL[item]}</option>
                ))}
              </Select>
            </Field>
            <Field label="产品意向">
              <Input name="inquiry_product" />
            </Field>
            <label className="flex items-center gap-2 text-sm md:mt-7">
              <input type="checkbox" name="inquiry_valid" />
              有效询盘
            </label>
            <Field label="来源内容">
              <Input name="inquiry_source_content" placeholder="没有就留空" />
            </Field>
            <Field label="来源广告">
              <Input name="inquiry_source_campaign" placeholder="没有就留空" />
            </Field>
          </div>
          <Field label="备注">
            <Textarea name="inquiry_notes" />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "保存中…" : "添加询盘"}</Button>
        </>
      )}
    </BindForm>
  );
}

export function FollowUpForm({ customerId, today = "" }: { customerId: string; today?: string }) {
  return (
    <BindForm action={addFollowUp} className="grid gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="customer_id" value={customerId} />
          <Field label="任务">
            <Input name="task" required placeholder="例如：周三确认是否付定金" />
          </Field>
          <Field label="沟通内容">
            <Textarea name="content" placeholder="记下客户原话" />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="下次跟进日">
              <Input type="date" name="next_follow_up_on" defaultValue={today} />
            </Field>
            <Field label="最新意向">
              <Input name="latest_intent" />
            </Field>
          </div>
          <Button type="submit" disabled={pending}>{pending ? "保存中…" : "添加跟进"}</Button>
        </>
      )}
    </BindForm>
  );
}

export function PaymentForm({ orderId, today = "" }: { orderId: string; today?: string }) {
  return (
    <BindForm action={addPayment} className="grid gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="order_id" value={orderId} />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="类型">
              <Select name="kind" defaultValue="deposit">
                {PAYMENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{PAYMENT_KIND_LABEL[kind]}</option>
                ))}
              </Select>
            </Field>
            <Field label="金额 USD">
              <Input name="amount" inputMode="decimal" required placeholder="60.00" />
            </Field>
            <Field label="到账日">
              <Input type="date" name="paid_on" required defaultValue={today} />
            </Field>
          </div>
          <Field label="备注">
            <Input name="note" />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "保存中…" : "记下款项"}</Button>
        </>
      )}
    </BindForm>
  );
}

export function CostForm({ orderId }: { orderId: string }) {
  return (
    <BindForm action={addCostLine} className="grid gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="order_id" value={orderId} />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="类别" hint="归因广告只填在这里。没有可靠归因就不要填。">
              <Select name="category" defaultValue="attributed_ad">
                {COST_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{COST_CATEGORY_LABEL[item]}</option>
                ))}
              </Select>
            </Field>
            <Field label="币种">
              <Select name="currency" defaultValue="USD">
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            </Field>
            <Field label="金额">
              <Input name="amount" inputMode="decimal" required />
            </Field>
          </div>
          <Field label="备注">
            <Input name="note" placeholder="哪一条广告、哪一天" />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "保存中…" : "追加费用"}</Button>
        </>
      )}
    </BindForm>
  );
}

export function AdForm({ ad, today = "" }: { ad?: AdStat; today?: string }) {
  return (
    <BindForm action={saveAd} className="grid gap-3">
      {(pending) => (
        <>
          {ad ? <input type="hidden" name="id" value={ad.id} /> : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="日期"><Input type="date" name="stat_date" required defaultValue={ad?.stat_date ?? today} /></Field>
            <Field label="平台">
              <Select name="platform" defaultValue={ad?.platform ?? "ig"}>
                {PLATFORMS.map((item) => <option key={item} value={item}>{PLATFORM_LABEL[item]}</option>)}
              </Select>
            </Field>
            <Field label="花费 USD"><Input name="spend" inputMode="decimal" defaultValue={centsToInput(ad?.spend_usd_cents ?? 0)} /></Field>
            <Field label="活动名"><Input name="campaign_name" defaultValue={ad?.campaign_name ?? ""} /></Field>
            <Field label="素材名"><Input name="creative_name" defaultValue={ad?.creative_name ?? ""} /></Field>
            <Field label="展示"><Input name="impressions" inputMode="numeric" defaultValue={ad?.impressions ?? 0} /></Field>
            <Field label="点击"><Input name="clicks" inputMode="numeric" defaultValue={ad?.clicks ?? 0} /></Field>
            <Field label="填报新增询盘" hint="手填，不从客户档案回写。"><Input name="new_inquiries" inputMode="numeric" defaultValue={ad?.new_inquiries ?? 0} /></Field>
            <Field label="填报有效询盘"><Input name="valid_inquiries" inputMode="numeric" defaultValue={ad?.valid_inquiries ?? 0} /></Field>
            <Field label="填报归因订单"><Input name="attributed_orders" inputMode="numeric" defaultValue={ad?.attributed_orders ?? 0} /></Field>
          </div>
          <Field label="备注"><Input name="note" defaultValue={ad?.note ?? ""} /></Field>
          <Button type="submit" disabled={pending}>{pending ? "保存中…" : ad ? "更新广告" : "添加广告"}</Button>
        </>
      )}
    </BindForm>
  );
}

export function PostForm({ post, today = "" }: { post?: ContentPost; today?: string }) {
  return (
    <BindForm action={savePost} className="grid gap-3">
      {(pending) => (
        <>
          {post ? <input type="hidden" name="id" value={post.id} /> : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="名称"><Input name="title" required defaultValue={post?.title ?? ""} /></Field>
            <Field label="平台">
              <Select name="platform" defaultValue={post?.platform ?? "ig"}>
                {PLATFORMS.map((item) => <option key={item} value={item}>{PLATFORM_LABEL[item]}</option>)}
              </Select>
            </Field>
            <Field label="类型">
              <Select name="content_type" defaultValue={post?.content_type ?? "process"}>
                {CONTENT_TYPES.map((item) => <option key={item} value={item}>{CONTENT_TYPE_LABEL[item]}</option>)}
              </Select>
            </Field>
            <Field label="发布日"><Input type="date" name="published_on" required defaultValue={post?.published_on ?? today} /></Field>
            <Field label="链接" className="md:col-span-2"><Input name="url" defaultValue={post?.url ?? ""} /></Field>
            <Field label="播放"><Input name="views" inputMode="numeric" defaultValue={post?.views ?? 0} /></Field>
            <Field label="赞"><Input name="likes" inputMode="numeric" defaultValue={post?.likes ?? 0} /></Field>
            <Field label="评论"><Input name="comments" inputMode="numeric" defaultValue={post?.comments ?? 0} /></Field>
            <Field label="带来的有效询盘" hint="手填。"><Input name="valid_inquiries" inputMode="numeric" defaultValue={post?.valid_inquiries ?? 0} /></Field>
            <Field label="带来的订单" hint="手填，不会自动算进订单利润。"><Input name="orders_count" inputMode="numeric" defaultValue={post?.orders_count ?? 0} /></Field>
          </div>
          <Field label="备注"><Input name="note" defaultValue={post?.note ?? ""} /></Field>
          <Button type="submit" disabled={pending}>{pending ? "保存中…" : post ? "更新内容" : "添加内容"}</Button>
        </>
      )}
    </BindForm>
  );
}

export function WeeklyForm({ weekStart, answers, canWrite }: { weekStart: string; answers: WeeklyAnswers; canWrite: boolean }) {
  return (
    <BindForm action={saveWeeklyReview} className="grid gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="week_start" value={weekStart} />
          {WEEKLY_QUESTIONS.map((question) => (
            <Field key={question.key} label={question.label}>
              <Textarea name={question.key} defaultValue={answers[question.key]} disabled={!canWrite} />
            </Field>
          ))}
          <Field label="本周改进措施（1–2 件）" hint="写清谁在什么时候做完，以及怎么判断它有没有用。">
            <Textarea name="improvements" defaultValue={answers.improvements} disabled={!canWrite} />
          </Field>
          {canWrite ? <Button type="submit" disabled={pending}>{pending ? "保存中…" : "保存周复盘"}</Button> : <p className="text-sm text-muted-foreground">内容角色可以看，不能改复盘。</p>}
        </>
      )}
    </BindForm>
  );
}

export function MonthlyForm({ monthStart, answers, canWrite }: { monthStart: string; answers: MonthlyAnswers; canWrite: boolean }) {
  const fields: { name: keyof MonthlyAnswers; label: string }[] = [
    { name: "what_worked", label: "这个月真正有效的做法" },
    { name: "what_failed", label: "这个月失效的做法" },
    { name: "blockers", label: "主要阻碍" },
    { name: "next_focus", label: "下月只抓的 1–2 件事" },
    { name: "notes", label: "其他" },
  ];
  return (
    <BindForm action={saveMonthlyReview} className="grid gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="month_start" value={monthStart} />
          {fields.map((item) => (
            <Field key={item.name} label={item.label}>
              <Textarea name={item.name} defaultValue={answers[item.name]} disabled={!canWrite} />
            </Field>
          ))}
          {canWrite ? <Button type="submit" disabled={pending}>{pending ? "保存中…" : "保存月复盘"}</Button> : null}
        </>
      )}
    </BindForm>
  );
}

export function SettingsForm({ fxE6, targets }: { fxE6: number; targets: Record<string, number> }) {
  const rows = Object.entries(targets).sort(([a], [b]) => a.localeCompare(b));
  return (
    <BindForm action={saveSettings} className="grid gap-4">
      {(pending) => (
        <>
          <Field label="汇率：1 美元兑换多少人民币" hint="手动汇率，不是实时牌价。只影响之后新保存的订单；旧订单保留自己的快照。">
            <Input name="fx" defaultValue={formatFx(fxE6)} required />
          </Field>
          <div className="grid gap-2">
            <div className="text-sm font-medium">月度北极星目标</div>
            <p className="text-xs text-muted-foreground">口径是该月新增、广告前贡献利润为正的有效付费订单数。默认 2026-11 为 2，2026-12 为 5，2027-01 为 8。</p>
            {rows.map(([month, count]) => (
              <div key={month} className="grid grid-cols-[1fr_120px] gap-2">
                <Input name="target_month" defaultValue={month} />
                <Input name="target_count" inputMode="numeric" defaultValue={count} />
              </div>
            ))}
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input name="target_month" placeholder="2027-02" />
              <Input name="target_count" placeholder="新目标" />
            </div>
          </div>
          <Button type="submit" disabled={pending}>{pending ? "保存中…" : "保存设置"}</Button>
        </>
      )}
    </BindForm>
  );
}

export function RoleForm({ profile }: { profile: Profile }) {
  return (
    <BindForm action={saveRole} className="flex items-center gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="profile_id" value={profile.id} />
          <Select name="role" defaultValue={profile.role}>
            {ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABEL[role]}</option>
            ))}
          </Select>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>更新</Button>
        </>
      )}
    </BindForm>
  );
}
