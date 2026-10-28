export const ROLES = ["admin", "cs", "content"] as const;
export type Role = (typeof ROLES)[number];

export const STAGES = [
  "new_inquiry",
  "valid_inquiry",
  "quoted",
  "considering",
  "pending_payment",
  "paid",
  "lost",
] as const;
export type CustomerStage = (typeof STAGES)[number];

export const LOST_REASONS = [
  "price_high",
  "lead_time",
  "shipping",
  "trust",
  "no_budget",
  "curious",
  "competitor",
  "no_reply",
  "other",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const PLATFORMS = ["ig", "fb", "tiktok", "youtube", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PRODUCTS = [
  "2d_charm",
  "3d_charm",
  "figurine",
  "frame",
  "scarf_hat",
  "other",
] as const;
export type ProductCode = (typeof PRODUCTS)[number];

export const ORDER_STATUSES = [
  "confirmed",
  "in_production",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_KINDS = ["deposit", "balance", "full", "refund", "other"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const COST_CATEGORIES = [
  "production",
  "shipping",
  "payment_fee",
  "other",
  "attributed_ad",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export const CONTENT_TYPES = [
  "process",
  "finished",
  "memorial",
  "review",
  "intro",
  "other",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CURRENCIES = ["USD", "CNY"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  instagram_handle: string | null;
  instagram_handle_norm: string | null;
  tiktok_handle: string | null;
  profile_url: string | null;
  country: string | null;
  contact: string | null;
  first_inquiry_date: string | null;
  acquisition_platform: Platform | null;
  source_content: string | null;
  source_campaign: string | null;
  interested_products: ProductCode[];
  pet_type: string | null;
  pet_alive: boolean | null;
  purchase_purpose: string | null;
  quantity: number | null;
  size_note: string | null;
  special_requirements: string | null;
  budget_usd_cents: number | null;
  notes: string | null;
  stage: CustomerStage;
  latest_intent: string | null;
  lost_reason: LostReason | null;
  lost_reason_custom: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StatusEvent = {
  id: string;
  customer_id: string;
  from_stage: CustomerStage | null;
  to_stage: CustomerStage;
  lost_reason: LostReason | null;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type Inquiry = {
  id: string;
  customer_id: string;
  inquiry_date: string;
  platform: Platform;
  source_content: string | null;
  source_campaign: string | null;
  is_valid: boolean;
  product_interest: string | null;
  notes: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
};

export type FollowUp = {
  id: string;
  customer_id: string;
  inquiry_id: string | null;
  task: string;
  content: string | null;
  next_follow_up_on: string | null;
  latest_intent: string | null;
  completed: boolean;
  completed_at: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  order_number: string;
  product_code: ProductCode;
  product_name: string;
  size_note: string | null;
  quantity: number;
  gross_amount_usd_cents: number;
  discount_usd_cents: number;
  agreed_deposit_usd_cents: number;
  production_cost_cny_fen: number;
  shipping_cost_cny_fen: number;
  payment_fee_usd_cents: number;
  other_cost_cny_fen: number;
  fx_cny_per_usd_e6: number;
  order_date: string;
  expected_ship_date: string | null;
  actual_ship_date: string | null;
  status: OrderStatus;
  has_review: boolean;
  review_on: string | null;
  notes: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  kind: PaymentKind;
  amount_usd_cents: number;
  paid_on: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type CostLine = {
  id: string;
  order_id: string;
  category: CostCategory;
  currency: Currency;
  amount_minor: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type AdStat = {
  id: string;
  stat_date: string;
  platform: Platform;
  campaign_name: string;
  creative_name: string;
  spend_usd_cents: number;
  impressions: number;
  clicks: number;
  new_inquiries: number;
  valid_inquiries: number;
  attributed_orders: number;
  note: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentPost = {
  id: string;
  title: string;
  platform: Platform;
  published_on: string;
  url: string | null;
  content_type: ContentType;
  views: number;
  likes: number;
  comments: number;
  valid_inquiries: number;
  orders_count: number;
  note: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyAnswers = {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  improvements: string;
};

export type MonthlyAnswers = {
  what_worked: string;
  what_failed: string;
  blockers: string;
  next_focus: string;
  notes: string;
};

export type WeeklyReview = {
  id: string;
  week_start: string;
  answers: WeeklyAnswers;
  updated_by: string | null;
  updated_at: string;
};

export type MonthlyReview = {
  id: string;
  month_start: string;
  answers: MonthlyAnswers;
  updated_by: string | null;
  updated_at: string;
};

export type Snapshot = {
  profiles: Profile[];
  customers: Customer[];
  statusHistory: StatusEvent[];
  inquiries: Inquiry[];
  followUps: FollowUp[];
  orders: Order[];
  payments: Payment[];
  costLines: CostLine[];
  ads: AdStat[];
  posts: ContentPost[];
  weeklyReviews: WeeklyReview[];
  monthlyReviews: MonthlyReview[];
  fxE6: number;
  targets: Record<string, number>;
};

export type CustomerInput = Omit<
  Customer,
  | "id"
  | "instagram_handle_norm"
  | "is_demo"
  | "created_by"
  | "created_at"
  | "updated_at"
>;

export type InquiryInput = Omit<
  Inquiry,
  "id" | "customer_id" | "is_demo" | "created_by" | "created_at"
>;

export type FollowUpInput = Omit<
  FollowUp,
  "id" | "customer_id" | "is_demo" | "created_by" | "created_at" | "completed" | "completed_at"
>;

export type OrderInput = Omit<
  Order,
  | "id"
  | "order_number"
  | "fx_cny_per_usd_e6"
  | "is_demo"
  | "created_by"
  | "created_at"
  | "updated_at"
>;

export type PaymentInput = Omit<Payment, "id" | "created_by" | "created_at">;
export type CostLineInput = Omit<CostLine, "id" | "created_by" | "created_at">;
export type AdInput = Omit<AdStat, "id" | "is_demo" | "created_by" | "created_at" | "updated_at">;
export type PostInput = Omit<
  ContentPost,
  "id" | "is_demo" | "created_by" | "created_at" | "updated_at"
>;
