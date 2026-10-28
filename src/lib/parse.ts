import { isYmd } from "@/lib/dates";
import { normalizeInstagram } from "@/lib/instagram";
import { parseCnyToFen, parseUsdToCents } from "@/lib/money";
import {
  CONTENT_TYPES,
  COST_CATEGORIES,
  CURRENCIES,
  LOST_REASONS,
  ORDER_STATUSES,
  PAYMENT_KINDS,
  PLATFORMS,
  PRODUCTS,
  STAGES,
  type AdInput,
  type ContentType,
  type CostCategory,
  type CostLineInput,
  type Currency,
  type CustomerInput,
  type CustomerStage,
  type FollowUpInput,
  type InquiryInput,
  type LostReason,
  type MonthlyAnswers,
  type OrderInput,
  type OrderStatus,
  type PaymentInput,
  type PaymentKind,
  type Platform,
  type PostInput,
  type ProductCode,
  type WeeklyAnswers,
} from "@/lib/types";

export function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function opt(form: FormData, key: string): string | null {
  const value = field(form, key);
  return value ? value : null;
}

function mustEnum<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!(allowed as readonly string[]).includes(value)) throw new Error(`请选择${label}`);
  return value as T;
}

function optEnum<T extends string>(value: string, allowed: readonly T[]): T | null {
  if (!value) return null;
  if (!(allowed as readonly string[]).includes(value)) return null;
  return value as T;
}

function dateField(form: FormData, key: string, label: string, required: boolean): string | null {
  const value = field(form, key);
  if (!value) {
    if (required) throw new Error(`请填写${label}`);
    return null;
  }
  if (!isYmd(value)) throw new Error(`${label}日期无效`);
  return value;
}

function money(form: FormData, key: string, label: string): number {
  const value = field(form, key);
  if (!value) return 0;
  try {
    return parseUsdToCents(value);
  } catch {
    throw new Error(`${label}必须是大于等于 0 的数字`);
  }
}

function fen(form: FormData, key: string, label: string): number {
  const value = field(form, key);
  if (!value) return 0;
  try {
    return parseCnyToFen(value);
  } catch {
    throw new Error(`${label}必须是大于等于 0 的数字`);
  }
}

function intField(form: FormData, key: string, label: string, fallback: number | null): number | null {
  const value = field(form, key);
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label}必须是大于等于 0 的整数`);
  return n;
}

function petAlive(form: FormData): boolean | null {
  const value = field(form, "pet_alive");
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function parseCustomer(form: FormData): CustomerInput {
  const name = field(form, "name");
  if (!name) throw new Error("请填写客户姓名或备注名");
  const stage = mustEnum(field(form, "stage") || "new_inquiry", STAGES, "销售阶段") as CustomerStage;
  const lost = optEnum(field(form, "lost_reason"), LOST_REASONS) as LostReason | null;
  if (stage === "lost" && !lost) throw new Error("流失客户需要选择流失原因");
  const products = form
    .getAll("products")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is ProductCode => (PRODUCTS as readonly string[]).includes(value));
  const quantity = intField(form, "quantity", "数量", null);
  const budgetRaw = field(form, "budget");
  return {
    name,
    instagram_handle: opt(form, "instagram_handle"),
    tiktok_handle: opt(form, "tiktok_handle"),
    profile_url: opt(form, "profile_url"),
    country: opt(form, "country"),
    contact: opt(form, "contact"),
    first_inquiry_date: dateField(form, "first_inquiry_date", "首次询盘日", false),
    acquisition_platform: optEnum(field(form, "acquisition_platform"), PLATFORMS) as Platform | null,
    source_content: opt(form, "source_content"),
    source_campaign: opt(form, "source_campaign"),
    interested_products: products,
    pet_type: opt(form, "pet_type"),
    pet_alive: petAlive(form),
    purchase_purpose: opt(form, "purchase_purpose"),
    quantity,
    size_note: opt(form, "size_note"),
    special_requirements: opt(form, "special_requirements"),
    budget_usd_cents: budgetRaw ? money(form, "budget", "预算") : null,
    notes: opt(form, "notes"),
    stage,
    latest_intent: opt(form, "latest_intent"),
    lost_reason: stage === "lost" ? lost : null,
    lost_reason_custom: stage === "lost" ? opt(form, "lost_reason_custom") : null,
  };
}

export function parseOptionalInquiry(form: FormData): InquiryInput | null {
  if (form.get("create_inquiry") !== "on") return null;
  return parseInquiry(form);
}

export function parseInquiry(form: FormData): InquiryInput {
  const platform = optEnum(field(form, "inquiry_platform"), PLATFORMS);
  if (!platform) throw new Error("请选择询盘平台");
  return {
    inquiry_date: dateField(form, "inquiry_date", "询盘日期", true)!,
    platform,
    source_content: opt(form, "inquiry_source_content"),
    source_campaign: opt(form, "inquiry_source_campaign"),
    is_valid: form.get("inquiry_valid") === "on",
    product_interest: opt(form, "inquiry_product"),
    notes: opt(form, "inquiry_notes"),
  };
}

export function parseFollowUp(form: FormData): FollowUpInput {
  const task = field(form, "task");
  if (!task) throw new Error("请填写跟进任务");
  return {
    inquiry_id: opt(form, "inquiry_id"),
    task,
    content: opt(form, "content"),
    next_follow_up_on: dateField(form, "next_follow_up_on", "下次跟进日", false),
    latest_intent: opt(form, "latest_intent"),
  };
}

export function parseOrder(form: FormData): OrderInput {
  const customerId = field(form, "customer_id");
  if (!customerId) throw new Error("请选择客户");
  const gross = money(form, "gross", "成交金额");
  const discount = money(form, "discount", "优惠");
  if (discount > gross) throw new Error("优惠不能大于成交金额");
  const quantity = intField(form, "quantity", "数量", 1) ?? 1;
  if (quantity < 1) throw new Error("数量至少为 1");
  return {
    customer_id: customerId,
    product_code: mustEnum(field(form, "product_code"), PRODUCTS, "产品"),
    product_name: field(form, "product_name"),
    size_note: opt(form, "size_note"),
    quantity,
    gross_amount_usd_cents: gross,
    discount_usd_cents: discount,
    agreed_deposit_usd_cents: money(form, "deposit", "约定定金"),
    production_cost_cny_fen: fen(form, "production", "制作成本"),
    shipping_cost_cny_fen: fen(form, "shipping", "物流成本"),
    payment_fee_usd_cents: money(form, "fee", "支付手续费"),
    other_cost_cny_fen: fen(form, "other_cost", "其他可变成本"),
    order_date: dateField(form, "order_date", "下单日", true)!,
    expected_ship_date: dateField(form, "expected_ship_date", "预计发货", false),
    actual_ship_date: dateField(form, "actual_ship_date", "实际发货", false),
    status: mustEnum(field(form, "status") || "confirmed", ORDER_STATUSES, "订单状态") as OrderStatus,
    has_review: form.get("has_review") === "on",
    review_on: dateField(form, "review_on", "评价日期", false),
    notes: opt(form, "notes"),
  };
}

export function parsePayment(form: FormData): PaymentInput {
  const amount = money(form, "amount", "收款金额");
  if (amount <= 0) throw new Error("收款金额必须大于 0");
  return {
    order_id: field(form, "order_id"),
    kind: mustEnum(field(form, "kind"), PAYMENT_KINDS, "款项类型") as PaymentKind,
    amount_usd_cents: amount,
    paid_on: dateField(form, "paid_on", "到账日", true)!,
    note: opt(form, "note"),
  };
}

export function parseCostLine(form: FormData): CostLineInput {
  const currency = mustEnum(field(form, "currency") || "USD", CURRENCIES, "币种") as Currency;
  const raw = field(form, "amount");
  if (!raw) throw new Error("请填写费用金额");
  const amount = currency === "CNY" ? parseCnyToFen(raw) : parseUsdToCents(raw);
  if (amount <= 0) throw new Error("费用金额必须大于 0");
  return {
    order_id: field(form, "order_id"),
    category: mustEnum(field(form, "category"), COST_CATEGORIES, "费用类别") as CostCategory,
    currency,
    amount_minor: amount,
    note: opt(form, "note"),
  };
}

export function parseAd(form: FormData): AdInput {
  return {
    stat_date: dateField(form, "stat_date", "日期", true)!,
    platform: mustEnum(field(form, "platform"), PLATFORMS, "平台"),
    campaign_name: field(form, "campaign_name"),
    creative_name: field(form, "creative_name"),
    spend_usd_cents: money(form, "spend", "花费"),
    impressions: intField(form, "impressions", "展示", 0) ?? 0,
    clicks: intField(form, "clicks", "点击", 0) ?? 0,
    new_inquiries: intField(form, "new_inquiries", "新增询盘", 0) ?? 0,
    valid_inquiries: intField(form, "valid_inquiries", "有效询盘", 0) ?? 0,
    attributed_orders: intField(form, "attributed_orders", "归因订单", 0) ?? 0,
    note: opt(form, "note"),
  };
}

export function parsePost(form: FormData): PostInput {
  const title = field(form, "title");
  if (!title) throw new Error("请填写内容名称");
  return {
    title,
    platform: mustEnum(field(form, "platform"), PLATFORMS, "平台"),
    published_on: dateField(form, "published_on", "发布日", true)!,
    url: opt(form, "url"),
    content_type: mustEnum(field(form, "content_type"), CONTENT_TYPES, "内容类型") as ContentType,
    views: intField(form, "views", "播放", 0) ?? 0,
    likes: intField(form, "likes", "点赞", 0) ?? 0,
    comments: intField(form, "comments", "评论", 0) ?? 0,
    valid_inquiries: intField(form, "valid_inquiries", "有效询盘", 0) ?? 0,
    orders_count: intField(form, "orders_count", "订单数", 0) ?? 0,
    note: opt(form, "note"),
  };
}

export function parseWeekly(form: FormData): WeeklyAnswers {
  return {
    q1: field(form, "q1"),
    q2: field(form, "q2"),
    q3: field(form, "q3"),
    q4: field(form, "q4"),
    q5: field(form, "q5"),
    q6: field(form, "q6"),
    q7: field(form, "q7"),
    improvements: field(form, "improvements"),
  };
}

export function parseMonthly(form: FormData): MonthlyAnswers {
  return {
    what_worked: field(form, "what_worked"),
    what_failed: field(form, "what_failed"),
    blockers: field(form, "blockers"),
    next_focus: field(form, "next_focus"),
    notes: field(form, "notes"),
  };
}

export function instagramOrNull(handle: string | null): string | null {
  return normalizeInstagram(handle);
}
