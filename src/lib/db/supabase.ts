import "server-only";

import { shanghaiToday } from "@/lib/dates";
import { buildDemoRecords } from "@/lib/demo-data";
import { DEFAULT_FX_E6, DEFAULT_TARGETS } from "@/lib/money";
import { assertCan, assertRoleChange } from "@/lib/permissions";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";
import type {
  AdStat,
  ContentPost,
  CostLine,
  Customer,
  CustomerStage,
  FollowUp,
  Inquiry,
  LostReason,
  MonthlyAnswers,
  MonthlyReview,
  Order,
  Payment,
  Platform,
  ProductCode,
  Profile,
  Role,
  SessionUser,
  Snapshot,
  StatusEvent,
  WeeklyAnswers,
  WeeklyReview,
} from "@/lib/types";

type SbError = { message: string; code?: string } | null;

function fail(error: SbError): never {
  if (!error) throw new Error("数据库没有返回结果");
  if (error.code === "23505" || error.message.includes("customers_ig_norm")) {
    throw new Error("该 Instagram 账号已有客户档案，不能重复建档");
  }
  if (error.code === "23503") throw new Error("还有关联记录，不能删除");
  if (error.message.includes("only admin")) throw new Error("只有创始人可以修改角色");
  if (error.message.includes("last admin")) throw new Error("不能取消最后一位创始人");
  throw new Error(error.message);
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  return num(value);
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function asTargets(value: unknown): Record<string, number> {
  const stored: Record<string, number> = {};
  if (value && typeof value === "object") {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}$/.test(key)) stored[key] = Math.max(0, Math.round(num(raw)));
    }
  }
  return { ...DEFAULT_TARGETS, ...stored };
}

function asWeekly(value: unknown): WeeklyAnswers {
  const row = (value ?? {}) as Partial<WeeklyAnswers>;
  return {
    q1: row.q1 ?? "",
    q2: row.q2 ?? "",
    q3: row.q3 ?? "",
    q4: row.q4 ?? "",
    q5: row.q5 ?? "",
    q6: row.q6 ?? "",
    q7: row.q7 ?? "",
    improvements: row.improvements ?? "",
  };
}

function asMonthly(value: unknown): MonthlyAnswers {
  const row = (value ?? {}) as Partial<MonthlyAnswers>;
  return {
    what_worked: row.what_worked ?? "",
    what_failed: row.what_failed ?? "",
    blockers: row.blockers ?? "",
    next_focus: row.next_focus ?? "",
    notes: row.notes ?? "",
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    instagram_handle: strOrNull(row.instagram_handle),
    instagram_handle_norm: strOrNull(row.instagram_handle_norm),
    tiktok_handle: strOrNull(row.tiktok_handle),
    profile_url: strOrNull(row.profile_url),
    country: strOrNull(row.country),
    contact: strOrNull(row.contact),
    first_inquiry_date: strOrNull(row.first_inquiry_date),
    acquisition_platform: strOrNull(row.acquisition_platform) as Platform | null,
    source_content: strOrNull(row.source_content),
    source_campaign: strOrNull(row.source_campaign),
    interested_products: Array.isArray(row.interested_products) ? (row.interested_products as ProductCode[]) : [],
    pet_type: strOrNull(row.pet_type),
    pet_alive: row.pet_alive == null ? null : Boolean(row.pet_alive),
    purchase_purpose: strOrNull(row.purchase_purpose),
    quantity: numOrNull(row.quantity),
    size_note: strOrNull(row.size_note),
    special_requirements: strOrNull(row.special_requirements),
    budget_usd_cents: numOrNull(row.budget_usd_cents),
    notes: strOrNull(row.notes),
    stage: row.stage as Customer["stage"],
    latest_intent: strOrNull(row.latest_intent),
    lost_reason: strOrNull(row.lost_reason) as LostReason | null,
    lost_reason_custom: strOrNull(row.lost_reason_custom),
    is_demo: Boolean(row.is_demo),
    created_by: strOrNull(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function customerRow(input: Omit<Customer, "id" | "instagram_handle_norm" | "created_at" | "updated_at"> & { id?: string }) {
  return {
    name: input.name,
    instagram_handle: input.instagram_handle,
    tiktok_handle: input.tiktok_handle,
    profile_url: input.profile_url,
    country: input.country,
    contact: input.contact,
    first_inquiry_date: input.first_inquiry_date,
    acquisition_platform: input.acquisition_platform,
    source_content: input.source_content,
    source_campaign: input.source_campaign,
    interested_products: input.interested_products,
    pet_type: input.pet_type,
    pet_alive: input.pet_alive,
    purchase_purpose: input.purchase_purpose,
    quantity: input.quantity,
    size_note: input.size_note,
    special_requirements: input.special_requirements,
    budget_usd_cents: input.budget_usd_cents,
    notes: input.notes,
    stage: input.stage,
    latest_intent: input.latest_intent,
    lost_reason: input.stage === "lost" ? input.lost_reason : null,
    lost_reason_custom: input.stage === "lost" ? input.lost_reason_custom : null,
    is_demo: input.is_demo,
    created_by: input.created_by,
  };
}

export function createSupabaseDb(): Database {
  async function client() {
    return createSupabaseServer();
  }

  return {
    mode: "supabase",
    async loadSnapshot() {
      const supabase = await client();
      const [customers, inquiries, followUps, history, orders, payments, lines, ads, posts, weekly, monthly, profiles, fx, targets] =
        await Promise.all([
          supabase.from("customers").select("*"),
          supabase.from("inquiries").select("*"),
          supabase.from("follow_ups").select("*"),
          supabase.from("customer_status_history").select("*"),
          supabase.from("orders").select("*"),
          supabase.from("order_payments").select("*"),
          supabase.from("order_cost_lines").select("*"),
          supabase.from("ad_daily_stats").select("*"),
          supabase.from("content_posts").select("*"),
          supabase.from("weekly_reviews").select("*"),
          supabase.from("monthly_reviews").select("*"),
          supabase.from("profiles").select("*"),
          supabase.rpc("current_fx_cny_per_usd_e6"),
          supabase.rpc("monthly_order_targets"),
        ]);
      for (const result of [customers, inquiries, followUps, history, orders, payments, lines, ads, posts, weekly, monthly, profiles, fx, targets]) {
        if (result.error) fail(result.error);
      }
      const snap: Snapshot = {
        customers: ((customers.data ?? []) as Record<string, unknown>[]).map(mapCustomer),
        inquiries: ((inquiries.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          customer_id: String(row.customer_id),
          inquiry_date: String(row.inquiry_date),
          platform: row.platform as Platform,
          source_content: strOrNull(row.source_content),
          source_campaign: strOrNull(row.source_campaign),
          is_valid: Boolean(row.is_valid),
          product_interest: strOrNull(row.product_interest),
          notes: strOrNull(row.notes),
          is_demo: Boolean(row.is_demo),
          created_by: strOrNull(row.created_by),
          created_at: String(row.created_at),
        })) satisfies Inquiry[],
        followUps: ((followUps.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          customer_id: String(row.customer_id),
          inquiry_id: strOrNull(row.inquiry_id),
          task: String(row.task ?? ""),
          content: strOrNull(row.content),
          next_follow_up_on: strOrNull(row.next_follow_up_on),
          latest_intent: strOrNull(row.latest_intent),
          completed: Boolean(row.completed),
          completed_at: strOrNull(row.completed_at),
          is_demo: Boolean(row.is_demo),
          created_by: strOrNull(row.created_by),
          created_at: String(row.created_at),
        })) satisfies FollowUp[],
        statusHistory: ((history.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          customer_id: String(row.customer_id),
          from_stage: strOrNull(row.from_stage) as CustomerStage | null,
          to_stage: row.to_stage as CustomerStage,
          lost_reason: strOrNull(row.lost_reason) as LostReason | null,
          note: strOrNull(row.note),
          changed_by: strOrNull(row.changed_by),
          changed_at: String(row.changed_at),
        })) satisfies StatusEvent[],
        orders: ((orders.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          customer_id: String(row.customer_id),
          order_number: String(row.order_number),
          product_code: row.product_code as Order["product_code"],
          product_name: String(row.product_name ?? ""),
          size_note: strOrNull(row.size_note),
          quantity: num(row.quantity, 1),
          gross_amount_usd_cents: num(row.gross_amount_usd_cents),
          discount_usd_cents: num(row.discount_usd_cents),
          agreed_deposit_usd_cents: num(row.agreed_deposit_usd_cents),
          production_cost_cny_fen: num(row.production_cost_cny_fen),
          shipping_cost_cny_fen: num(row.shipping_cost_cny_fen),
          payment_fee_usd_cents: num(row.payment_fee_usd_cents),
          other_cost_cny_fen: num(row.other_cost_cny_fen),
          fx_cny_per_usd_e6: num(row.fx_cny_per_usd_e6, DEFAULT_FX_E6),
          order_date: String(row.order_date),
          expected_ship_date: strOrNull(row.expected_ship_date),
          actual_ship_date: strOrNull(row.actual_ship_date),
          status: row.status as Order["status"],
          has_review: Boolean(row.has_review),
          review_on: strOrNull(row.review_on),
          notes: strOrNull(row.notes),
          is_demo: Boolean(row.is_demo),
          created_by: strOrNull(row.created_by),
          created_at: String(row.created_at),
          updated_at: String(row.updated_at),
        })),
        payments: ((payments.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          order_id: String(row.order_id),
          kind: row.kind as Payment["kind"],
          amount_usd_cents: num(row.amount_usd_cents),
          paid_on: String(row.paid_on),
          note: strOrNull(row.note),
          created_by: strOrNull(row.created_by),
          created_at: String(row.created_at),
        })) satisfies Payment[],
        costLines: ((lines.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          order_id: String(row.order_id),
          category: row.category as CostLine["category"],
          currency: row.currency as CostLine["currency"],
          amount_minor: num(row.amount_minor),
          note: strOrNull(row.note),
          created_by: strOrNull(row.created_by),
          created_at: String(row.created_at),
        })),
        ads: ((ads.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          stat_date: String(row.stat_date),
          platform: row.platform as Platform,
          campaign_name: String(row.campaign_name ?? ""),
          creative_name: String(row.creative_name ?? ""),
          spend_usd_cents: num(row.spend_usd_cents),
          impressions: num(row.impressions),
          clicks: num(row.clicks),
          new_inquiries: num(row.new_inquiries),
          valid_inquiries: num(row.valid_inquiries),
          attributed_orders: num(row.attributed_orders),
          note: strOrNull(row.note),
          is_demo: Boolean(row.is_demo),
          created_by: strOrNull(row.created_by),
          created_at: String(row.created_at),
          updated_at: String(row.updated_at),
        })) satisfies AdStat[],
        posts: ((posts.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          title: String(row.title ?? ""),
          platform: row.platform as Platform,
          published_on: String(row.published_on),
          url: strOrNull(row.url),
          content_type: row.content_type as ContentPost["content_type"],
          views: num(row.views),
          likes: num(row.likes),
          comments: num(row.comments),
          valid_inquiries: num(row.valid_inquiries),
          orders_count: num(row.orders_count),
          note: strOrNull(row.note),
          is_demo: Boolean(row.is_demo),
          created_by: strOrNull(row.created_by),
          created_at: String(row.created_at),
          updated_at: String(row.updated_at),
        })),
        weeklyReviews: ((weekly.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          week_start: String(row.week_start),
          answers: asWeekly(row.answers),
          updated_by: strOrNull(row.updated_by),
          updated_at: String(row.updated_at),
        })) satisfies WeeklyReview[],
        monthlyReviews: ((monthly.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          month_start: String(row.month_start),
          answers: asMonthly(row.answers),
          updated_by: strOrNull(row.updated_by),
          updated_at: String(row.updated_at),
        })) satisfies MonthlyReview[],
        profiles: ((profiles.data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          email: String(row.email ?? ""),
          full_name: String(row.full_name ?? ""),
          role: row.role as Role,
          created_at: String(row.created_at),
          updated_at: String(row.updated_at),
        })) satisfies Profile[],
        fxE6: num(fx.data, DEFAULT_FX_E6),
        targets: asTargets(targets.data),
      };
      return snap;
    },
    async insertCustomer(input, user, inquiry) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const inserted = await supabase
        .from("customers")
        .insert({ ...customerRow({ ...input, is_demo: false, created_by: user.id }), created_by: user.id })
        .select("id, stage, lost_reason")
        .single();
      if (inserted.error) fail(inserted.error);
      const id = String(inserted.data.id);
      const history = await supabase.from("customer_status_history").insert({
        customer_id: id,
        from_stage: null,
        to_stage: inserted.data.stage,
        lost_reason: inserted.data.lost_reason,
        changed_by: user.id,
      });
      if (history.error) fail(history.error);
      if (inquiry) {
        const row = await supabase.from("inquiries").insert({ ...inquiry, customer_id: id, is_demo: false, created_by: user.id });
        if (row.error) fail(row.error);
        if (!input.first_inquiry_date) {
          await supabase.from("customers").update({ first_inquiry_date: inquiry.inquiry_date }).eq("id", id);
        }
      }
      return id;
    },
    async updateCustomer(id, input, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const current = await supabase.from("customers").select("stage").eq("id", id).single();
      if (current.error) fail(current.error);
      const { is_demo: _keepDemo, created_by: _keepOwner, ...payload } = customerRow({
        ...input,
        is_demo: false,
        created_by: null,
      });
      const updated = await supabase.from("customers").update(payload).eq("id", id).select("stage, lost_reason").single();
      if (updated.error) fail(updated.error);
      if (current.data.stage !== input.stage) {
        const history = await supabase.from("customer_status_history").insert({
          customer_id: id,
          from_stage: current.data.stage,
          to_stage: input.stage,
          lost_reason: input.stage === "lost" ? input.lost_reason : null,
          changed_by: user.id,
        });
        if (history.error) fail(history.error);
      }
    },
    async deleteCustomer(id, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const orders = await supabase.from("orders").select("id").eq("customer_id", id).limit(1);
      if (orders.error) fail(orders.error);
      if ((orders.data ?? []).length) throw new Error("该客户已有订单，不能删除。可以把阶段改为已流失。");
      const deleted = await supabase.from("customers").delete().eq("id", id);
      if (deleted.error) fail(deleted.error);
    },
    async insertInquiry(customerId, input, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const customer = await supabase.from("customers").select("is_demo, first_inquiry_date").eq("id", customerId).single();
      if (customer.error) fail(customer.error);
      const inserted = await supabase.from("inquiries").insert({
        ...input,
        customer_id: customerId,
        is_demo: customer.data.is_demo,
        created_by: user.id,
      });
      if (inserted.error) fail(inserted.error);
      if (!customer.data.first_inquiry_date) {
        await supabase.from("customers").update({ first_inquiry_date: input.inquiry_date }).eq("id", customerId);
      }
    },
    async setInquiryValid(id, isValid, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const updated = await supabase.from("inquiries").update({ is_valid: isValid }).eq("id", id);
      if (updated.error) fail(updated.error);
    },
    async deleteInquiry(id, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const deleted = await supabase.from("inquiries").delete().eq("id", id);
      if (deleted.error) fail(deleted.error);
    },
    async insertFollowUp(customerId, input, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const customer = await supabase.from("customers").select("is_demo").eq("id", customerId).single();
      if (customer.error) fail(customer.error);
      const inserted = await supabase.from("follow_ups").insert({
        ...input,
        customer_id: customerId,
        is_demo: customer.data.is_demo,
        created_by: user.id,
      });
      if (inserted.error) fail(inserted.error);
      if (input.latest_intent) {
        await supabase.from("customers").update({ latest_intent: input.latest_intent }).eq("id", customerId);
      }
    },
    async setFollowUpCompleted(id, completed, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const updated = await supabase
        .from("follow_ups")
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (updated.error) fail(updated.error);
    },
    async deleteFollowUp(id, user) {
      assertCan(user.role, "customers.write");
      const supabase = await client();
      const deleted = await supabase.from("follow_ups").delete().eq("id", id);
      if (deleted.error) fail(deleted.error);
    },
    async insertOrder(input, user) {
      assertCan(user.role, "orders.write");
      const supabase = await client();
      const fx = await supabase.rpc("current_fx_cny_per_usd_e6");
      if (fx.error) fail(fx.error);
      const number = await supabase.rpc("next_order_number", { p_order_date: input.order_date });
      if (number.error) fail(number.error);
      const inserted = await supabase
        .from("orders")
        .insert({
          ...input,
          order_number: String(number.data),
          fx_cny_per_usd_e6: num(fx.data, DEFAULT_FX_E6),
          is_demo: false,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (inserted.error) fail(inserted.error);
      return String(inserted.data.id);
    },
    async updateOrder(id, input, user, refreshFx) {
      assertCan(user.role, "orders.write");
      const supabase = await client();
      let fxPatch: { fx_cny_per_usd_e6?: number } = {};
      if (refreshFx) {
        const fx = await supabase.rpc("current_fx_cny_per_usd_e6");
        if (fx.error) fail(fx.error);
        fxPatch = { fx_cny_per_usd_e6: num(fx.data, DEFAULT_FX_E6) };
      }
      const updated = await supabase.from("orders").update({ ...input, ...fxPatch }).eq("id", id);
      if (updated.error) fail(updated.error);
    },
    async insertPayment(input, user) {
      assertCan(user.role, "orders.write");
      const supabase = await client();
      const inserted = await supabase.from("order_payments").insert({ ...input, created_by: user.id });
      if (inserted.error) fail(inserted.error);
    },
    async deletePayment(id, user) {
      assertCan(user.role, "orders.write");
      const supabase = await client();
      const deleted = await supabase.from("order_payments").delete().eq("id", id);
      if (deleted.error) fail(deleted.error);
    },
    async insertCostLine(input, user) {
      assertCan(user.role, "orders.write");
      const supabase = await client();
      const inserted = await supabase.from("order_cost_lines").insert({ ...input, created_by: user.id });
      if (inserted.error) fail(inserted.error);
    },
    async deleteCostLine(id, user) {
      assertCan(user.role, "orders.write");
      const supabase = await client();
      const deleted = await supabase.from("order_cost_lines").delete().eq("id", id);
      if (deleted.error) fail(deleted.error);
    },
    async insertAd(input, user) {
      assertCan(user.role, "marketing.write");
      const supabase = await client();
      const inserted = await supabase.from("ad_daily_stats").insert({ ...input, is_demo: false, created_by: user.id });
      if (inserted.error) fail(inserted.error);
    },
    async updateAd(id, input, user) {
      assertCan(user.role, "marketing.write");
      const supabase = await client();
      const updated = await supabase.from("ad_daily_stats").update(input).eq("id", id);
      if (updated.error) fail(updated.error);
    },
    async deleteAd(id, user) {
      assertCan(user.role, "marketing.write");
      const supabase = await client();
      const deleted = await supabase.from("ad_daily_stats").delete().eq("id", id);
      if (deleted.error) fail(deleted.error);
    },
    async insertPost(input, user) {
      assertCan(user.role, "marketing.write");
      const supabase = await client();
      const inserted = await supabase.from("content_posts").insert({ ...input, is_demo: false, created_by: user.id });
      if (inserted.error) fail(inserted.error);
    },
    async updatePost(id, input, user) {
      assertCan(user.role, "marketing.write");
      const supabase = await client();
      const updated = await supabase.from("content_posts").update(input).eq("id", id);
      if (updated.error) fail(updated.error);
    },
    async deletePost(id, user) {
      assertCan(user.role, "marketing.write");
      const supabase = await client();
      const deleted = await supabase.from("content_posts").delete().eq("id", id);
      if (deleted.error) fail(deleted.error);
    },
    async saveWeekly(weekStart, answers, user) {
      assertCan(user.role, "reviews.write");
      await upsertReview("weekly_reviews", "week_start", weekStart, answers, user);
    },
    async saveMonthly(monthStart, answers, user) {
      assertCan(user.role, "reviews.write");
      await upsertReview("monthly_reviews", "month_start", monthStart, answers, user);
    },
    async updateSettings(fxE6, targets, user) {
      assertCan(user.role, "settings.read");
      const supabase = await client();
      const fx = await supabase.from("app_settings").upsert({
        key: "fx",
        value: { cny_per_usd_e6: fxE6 },
        updated_by: user.id,
      });
      if (fx.error) fail(fx.error);
      const target = await supabase.from("app_settings").upsert({
        key: "monthly_targets",
        value: targets,
        updated_by: user.id,
      });
      if (target.error) fail(target.error);
    },
    async updateRole(profileId, role, user) {
      assertCan(user.role, "team.write");
      const supabase = await client();
      const profiles = await supabase.from("profiles").select("id, role");
      if (profiles.error) fail(profiles.error);
      assertRoleChange((profiles.data ?? []) as Profile[], profileId, role);
      const updated = await supabase.from("profiles").update({ role }).eq("id", profileId);
      if (updated.error) fail(updated.error);
    },
    async loadDemo(user) {
      assertCan(user.role, "settings.read");
      await this.clearDemo(user);
      const supabase = await client();
      const demo = buildDemoRecords(shanghaiToday());
      const customers = await supabase.from("customers").insert(demo.customers);
      if (customers.error) fail(customers.error);
      const inquiries = await supabase.from("inquiries").insert(demo.inquiries);
      if (inquiries.error) fail(inquiries.error);
      const follows = await supabase.from("follow_ups").insert(demo.followUps);
      if (follows.error) fail(follows.error);
      const orders = await supabase.from("orders").insert(demo.orders);
      if (orders.error) fail(orders.error);
      const payments = await supabase.from("order_payments").insert(demo.payments);
      if (payments.error) fail(payments.error);
      const history = await supabase.from("customer_status_history").insert(demo.history);
      if (history.error) fail(history.error);
      const ads = await supabase.from("ad_daily_stats").insert(demo.ads);
      if (ads.error) fail(ads.error);
      const posts = await supabase.from("content_posts").insert(demo.posts);
      if (posts.error) fail(posts.error);
    },
    async clearDemo(user) {
      assertCan(user.role, "settings.read");
      const supabase = await client();
      const demoCustomers = await supabase.from("customers").select("id").eq("is_demo", true);
      if (demoCustomers.error) fail(demoCustomers.error);
      const ids = (demoCustomers.data ?? []).map((row) => row.id);
      if (ids.length) {
        const blocking = await supabase.from("orders").select("id").in("customer_id", ids).eq("is_demo", false);
        if (blocking.error) fail(blocking.error);
        if ((blocking.data ?? []).length) throw new Error("Demo 客户下还有未标记 Demo 的订单，先处理订单再清除");
      }
      const orders = await supabase.from("orders").delete().eq("is_demo", true);
      if (orders.error) fail(orders.error);
      const customers = await supabase.from("customers").delete().eq("is_demo", true);
      if (customers.error) fail(customers.error);
      const ads = await supabase.from("ad_daily_stats").delete().eq("is_demo", true);
      if (ads.error) fail(ads.error);
      const posts = await supabase.from("content_posts").delete().eq("is_demo", true);
      if (posts.error) fail(posts.error);
    },
  };
}

async function upsertReview(
  table: "weekly_reviews" | "monthly_reviews",
  column: "week_start" | "month_start",
  when: string,
  answers: WeeklyAnswers | MonthlyAnswers,
  user: SessionUser,
) {
  const supabase = await createSupabaseServer();
  const existing = await supabase.from(table).select("id").eq(column, when).maybeSingle();
  if (existing.error) fail(existing.error);
  if (existing.data?.id) {
    const updated = await supabase.from(table).update({ answers, updated_by: user.id }).eq("id", existing.data.id);
    if (updated.error) fail(updated.error);
    return;
  }
  const inserted = await supabase.from(table).insert({ [column]: when, answers, created_by: user.id, updated_by: user.id });
  if (inserted.error) fail(inserted.error);
}
