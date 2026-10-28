import { addDays } from "@/lib/dates";
import type {
  AdStat,
  ContentPost,
  Customer,
  FollowUp,
  Inquiry,
  Order,
  Payment,
  StatusEvent,
} from "@/lib/types";

function stamp(day: string): string {
  return `${day}T04:00:00.000Z`;
}

/**
 * Optional DEMO rows. Names are prefixed 【Demo】 and is_demo is true.
 * They stay out of operating metrics unless the viewer turns Demo on.
 */
export function buildDemoRecords(today: string) {
  const now = stamp(today);
  const lunaDay = addDays(today, -12);
  const kikiDay = addDays(today, -9);
  const mochiDay = addDays(today, -6);
  const orderDay = addDays(today, -4);
  const luna: Customer = {
    id: "10000000-0000-4000-8000-000000000001",
    name: "【Demo】Luna",
    instagram_handle: "@demo_luna",
    instagram_handle_norm: "demo_luna",
    tiktok_handle: null,
    profile_url: "https://instagram.com/demo_luna",
    country: "US",
    contact: "luna.demo@example.com",
    first_inquiry_date: lunaDay,
    acquisition_platform: "ig",
    source_content: null,
    source_campaign: null,
    interested_products: ["3d_charm"],
    pet_type: "狗",
    pet_alive: true,
    purchase_purpose: "日常纪念",
    quantity: 1,
    size_note: "中号",
    special_requirements: null,
    budget_usd_cents: 20000,
    notes: "演示客户，不是真实订单。",
    stage: "quoted",
    latest_intent: "在比较价格",
    lost_reason: null,
    lost_reason_custom: null,
    is_demo: true,
    created_by: null,
    created_at: now,
    updated_at: now,
  };
  const mochi: Customer = {
    ...luna,
    id: "10000000-0000-4000-8000-000000000002",
    name: "【Demo】Mochi",
    instagram_handle: "@demo_mochi",
    instagram_handle_norm: "demo_mochi",
    profile_url: "https://instagram.com/demo_mochi",
    contact: "mochi.demo@example.com",
    first_inquiry_date: mochiDay,
    country: "CA",
    stage: "paid",
    latest_intent: "已付定金",
    pet_type: "猫",
    budget_usd_cents: 17900,
  };
  const kiki: Customer = {
    ...luna,
    id: "10000000-0000-4000-8000-000000000003",
    name: "【Demo】Kiki",
    instagram_handle: "@demo_kiki",
    instagram_handle_norm: "demo_kiki",
    profile_url: null,
    contact: null,
    country: "UK",
    first_inquiry_date: kikiDay,
    stage: "lost",
    latest_intent: null,
    lost_reason: "price_high",
    lost_reason_custom: null,
    interested_products: ["2d_charm"],
    pet_alive: false,
    purchase_purpose: "纪念",
  };

  const inquiries: Inquiry[] = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      customer_id: luna.id,
      inquiry_date: lunaDay,
      platform: "ig",
      source_content: null,
      source_campaign: null,
      is_valid: true,
      product_interest: "3D 挂件",
      notes: "演示询盘",
      is_demo: true,
      created_by: null,
      created_at: now,
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      customer_id: mochi.id,
      inquiry_date: mochiDay,
      platform: "ig",
      source_content: null,
      source_campaign: null,
      is_valid: true,
      product_interest: "3D 挂件",
      notes: "演示询盘",
      is_demo: true,
      created_by: null,
      created_at: now,
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      customer_id: kiki.id,
      inquiry_date: kikiDay,
      platform: "tiktok",
      source_content: null,
      source_campaign: null,
      is_valid: false,
      product_interest: "2D 挂件",
      notes: "演示：只是问问价格",
      is_demo: true,
      created_by: null,
      created_at: now,
    },
  ];

  const followUps: FollowUp[] = [
    {
      id: "30000000-0000-4000-8000-000000000001",
      customer_id: luna.id,
      inquiry_id: inquiries[0]!.id,
      task: "确认是否接受 $179 报价",
      content: "演示跟进，已逾期。",
      next_follow_up_on: addDays(today, -3),
      latest_intent: "在比较价格",
      completed: false,
      completed_at: null,
      is_demo: true,
      created_by: null,
      created_at: now,
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      customer_id: mochi.id,
      inquiry_id: inquiries[1]!.id,
      task: "确认宠物照片是否清晰",
      content: "演示跟进，到期日是今天。",
      next_follow_up_on: today,
      latest_intent: "已付定金",
      completed: false,
      completed_at: null,
      is_demo: true,
      created_by: null,
      created_at: now,
    },
  ];

  const order: Order = {
    id: "40000000-0000-4000-8000-000000000001",
    customer_id: mochi.id,
    order_number: "DT-DEMO-0001",
    product_code: "3d_charm",
    product_name: "3D 挂件",
    size_note: "标准",
    quantity: 1,
    gross_amount_usd_cents: 17900,
    discount_usd_cents: 0,
    agreed_deposit_usd_cents: 6000,
    production_cost_cny_fen: 40000,
    shipping_cost_cny_fen: 8000,
    payment_fee_usd_cents: 60,
    other_cost_cny_fen: 0,
    fx_cny_per_usd_e6: 7200000,
    order_date: orderDay,
    expected_ship_date: addDays(today, 14),
    actual_ship_date: null,
    status: "confirmed",
    has_review: false,
    review_on: null,
    notes: "演示订单。定金已收，尾款未收。未填写归因广告。",
    is_demo: true,
    created_by: null,
    created_at: now,
    updated_at: now,
  };

  const payment: Payment = {
    id: "50000000-0000-4000-8000-000000000001",
    order_id: order.id,
    kind: "deposit",
    amount_usd_cents: 6000,
    paid_on: orderDay,
    note: "演示定金",
    created_by: null,
    created_at: now,
  };

  const ad: AdStat = {
    id: "60000000-0000-4000-8000-000000000001",
    stat_date: orderDay,
    platform: "ig",
    campaign_name: "【Demo】十月纪念",
    creative_name: "制作过程 15s",
    spend_usd_cents: 2000,
    impressions: 10000,
    clicks: 200,
    new_inquiries: 2,
    valid_inquiries: 1,
    attributed_orders: 0,
    note: "演示广告。归因订单数留 0，避免假装这单已经归因。",
    is_demo: true,
    created_by: null,
    created_at: now,
    updated_at: now,
  };

  const post: ContentPost = {
    id: "70000000-0000-4000-8000-000000000001",
    title: "【Demo】挂件制作过程",
    platform: "ig",
    published_on: addDays(today, -8),
    url: "https://instagram.com/p/demo",
    content_type: "process",
    views: 12000,
    likes: 340,
    comments: 18,
    valid_inquiries: 1,
    orders_count: 0,
    note: "演示内容。询盘和订单数是手填，不从 CRM 自动回写。",
    is_demo: true,
    created_by: null,
    created_at: now,
    updated_at: now,
  };

  const history: StatusEvent[] = [
    event("81000000-0000-4000-8000-000000000001", luna.id, null, "new_inquiry", null, stamp(lunaDay)),
    event("81000000-0000-4000-8000-000000000002", luna.id, "new_inquiry", "quoted", null, stamp(addDays(lunaDay, 1))),
    event("81000000-0000-4000-8000-000000000003", mochi.id, null, "new_inquiry", null, stamp(mochiDay)),
    event("81000000-0000-4000-8000-000000000004", mochi.id, "new_inquiry", "paid", null, stamp(orderDay)),
    event("81000000-0000-4000-8000-000000000005", kiki.id, null, "new_inquiry", null, stamp(kikiDay)),
    event("81000000-0000-4000-8000-000000000006", kiki.id, "new_inquiry", "lost", "price_high", stamp(addDays(kikiDay, 1))),
  ];

  return {
    customers: [luna, mochi, kiki],
    inquiries,
    followUps,
    orders: [order],
    payments: [payment],
    history,
    ads: [ad],
    posts: [post],
  };
}

function event(
  id: string,
  customerId: string,
  from: StatusEvent["from_stage"],
  to: StatusEvent["to_stage"],
  lost: StatusEvent["lost_reason"],
  at: string,
): StatusEvent {
  return {
    id,
    customer_id: customerId,
    from_stage: from,
    to_stage: to,
    lost_reason: lost,
    note: "Demo",
    changed_by: null,
    changed_at: at,
  };
}
