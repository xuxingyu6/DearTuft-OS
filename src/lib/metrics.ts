import { addDays, eachDay, inRange, monthKey, monthStart, shanghaiDate } from "@/lib/dates";
import { deliveryDate, orderFinance, sum } from "@/lib/finance";
import {
  LOST_REASON_LABEL,
  PLATFORM_LABEL,
  PRODUCT_LABEL,
  STAGE_LABEL,
} from "@/lib/labels";
import { ratio } from "@/lib/money";
import type {
  AdStat,
  Customer,
  CustomerStage,
  FollowUp,
  Inquiry,
  LostReason,
  Order,
  Platform,
  Role,
  Snapshot,
} from "@/lib/types";

export type DateRange = { from: string; to: string };

export type DailyPoint = {
  date: string;
  inquiries: number;
  validInquiries: number;
  orders: number;
  paidOrders: number;
  adSpendCents: number;
};

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  people: number;
  hint: string;
};

export type NamedCount = { key: string; label: string; count: number };
export type ProductSlice = { key: string; label: string; orders: number; netSalesCents: number };

export type FollowItem = {
  id: string;
  customerId: string;
  customerName: string;
  task: string;
  nextOn: string;
  intent: string | null;
};

export type RecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: Order["status"];
  orderDate: string;
  netSalesCents: number;
  validPaid: boolean;
  isDemo: boolean;
};

export type RatePair = { num: number; den: number; rate: number | null };

export type CohortResult = {
  customers: number;
  paid30: number;
  paid60: number;
  closed30: number;
  closed60: number;
  rate30: number | null;
  rate60: number | null;
  paidSoFar: number;
};

export type DashboardModel = {
  kpis: {
    inquiries: number;
    validInquiries: number;
    inquiryCustomers: number;
    validInquiryCustomers: number;
    quotedCustomers: number;
    orders: number;
    paidOrders: number;
    paidCustomers: number;
    northStar: number;
    deliveredOrders: number;
    reviewedOrders: number;
    netSalesCents: number;
    cashCollectedCents: number;
    unpaidCents: number;
    adSpendCents: number;
    attributedAdCents: number;
    unattributedPortfolioCents: number;
    attributionOverflow: boolean;
    profitBeforeCents: number;
    profitAfterAttributedCents: number;
    marginBefore: number | null;
    unattributedPaidOrders: number;
    attributedPaidOrders: number;
    blendedCacCents: number | null;
    attributedCacCents: number | null;
    impressions: number;
    clicks: number;
    ctr: number | null;
    posts: number;
  };
  validToPaid: RatePair;
  quotedToPaid: RatePair;
  cohort: CohortResult;
  series: DailyPoint[];
  funnel: FunnelStep[];
  channels: NamedCount[];
  products: ProductSlice[];
  lostReasons: NamedCount[];
  stageCounts: NamedCount[];
  followUpsToday: FollowItem[];
  followUpsOverdue: FollowItem[];
  recentOrders: RecentOrder[];
  monthTarget: {
    month: string;
    target: number | null;
    northStar: number;
    validPaid: number;
  };
  empty: boolean;
};

export type AdMetrics = {
  cpmCents: number | null;
  cpcCents: number | null;
  ctr: number | null;
  costPerInquiryCents: number | null;
  costPerValidCents: number | null;
  cacCents: number | null;
};

export function adMetrics(row: Pick<AdStat, "spend_usd_cents" | "impressions" | "clicks" | "new_inquiries" | "valid_inquiries" | "attributed_orders">): AdMetrics {
  return {
    cpmCents: row.impressions ? (row.spend_usd_cents / row.impressions) * 1000 : null,
    cpcCents: ratio(row.spend_usd_cents, row.clicks),
    ctr: ratio(row.clicks, row.impressions),
    costPerInquiryCents: ratio(row.spend_usd_cents, row.new_inquiries),
    costPerValidCents: ratio(row.spend_usd_cents, row.valid_inquiries),
    cacCents: ratio(row.spend_usd_cents, row.attributed_orders),
  };
}

function visibleCustomerIds(snap: Snapshot, includeDemo: boolean): Set<string> | null {
  if (includeDemo) return null;
  return new Set(snap.customers.filter((customer) => !customer.is_demo).map((customer) => customer.id));
}

export function scopeSnapshot(snapshot: Snapshot, role: Role): Snapshot {
  if (role === "admin" || role === "cs") return snapshot;
  return { ...snapshot, orders: [], payments: [], costLines: [], targets: {} };
}

export function operationalSnapshot(snap: Snapshot, includeDemo: boolean): Snapshot {
  if (includeDemo) return snap;
  const customers = snap.customers.filter((customer) => !customer.is_demo);
  const ids = new Set(customers.map((customer) => customer.id));
  const orders = snap.orders.filter((order) => !order.is_demo && ids.has(order.customer_id));
  const orderIds = new Set(orders.map((order) => order.id));
  return {
    ...snap,
    customers,
    inquiries: snap.inquiries.filter((row) => !row.is_demo && ids.has(row.customer_id)),
    followUps: snap.followUps.filter((row) => !row.is_demo && ids.has(row.customer_id)),
    statusHistory: snap.statusHistory.filter((row) => ids.has(row.customer_id)),
    orders,
    payments: snap.payments.filter((row) => orderIds.has(row.order_id)),
    costLines: snap.costLines.filter((row) => orderIds.has(row.order_id)),
    ads: snap.ads.filter((row) => !row.is_demo),
    posts: snap.posts.filter((row) => !row.is_demo),
  };
}

function firstInquiryDate(customer: Customer, inquiries: Inquiry[]): string | null {
  const dates = inquiries.filter((inquiry) => inquiry.customer_id === customer.id).map((inquiry) => inquiry.inquiry_date);
  if (customer.first_inquiry_date) dates.push(customer.first_inquiry_date);
  if (!dates.length) return null;
  return dates.slice().sort()[0] ?? null;
}

function rate(num: number, den: number): RatePair {
  return { num, den, rate: ratio(num, den) };
}

export function computeCohort(snap: Snapshot, range: DateRange, today: string): CohortResult {
  let customers = 0;
  let paid30 = 0;
  let paid60 = 0;
  let closed30 = 0;
  let closed60 = 0;
  let paidSoFar = 0;

  for (const customer of snap.customers) {
    const first = firstInquiryDate(customer, snap.inquiries);
    if (!first || !inRange(first, range.from, range.to)) continue;
    customers += 1;
    const orders = snap.orders.filter((order) => order.customer_id === customer.id);
    const paidOn = (within: number) =>
      orders.some((order) => {
        const finance = orderFinance(order, snap.payments, snap.costLines);
        if (!finance.validPaid) return false;
        return order.order_date >= first && order.order_date <= addDays(first, within);
      });
    const hit30 = paidOn(30);
    const hit60 = paidOn(60);
    const anyPaid = orders.some((order) => {
      const finance = orderFinance(order, snap.payments, snap.costLines);
      return finance.validPaid && order.order_date >= first;
    });
    if (anyPaid) paidSoFar += 1;
    if (addDays(first, 30) <= today) {
      closed30 += 1;
      if (hit30) paid30 += 1;
    }
    if (addDays(first, 60) <= today) {
      closed60 += 1;
      if (hit60) paid60 += 1;
    }
  }

  return {
    customers,
    paid30,
    paid60,
    closed30,
    closed60,
    rate30: ratio(paid30, closed30),
    rate60: ratio(paid60, closed60),
    paidSoFar,
  };
}

export function computeDashboard(snapInput: Snapshot, range: DateRange, today: string, includeDemo: boolean): DashboardModel {
  const snap = operationalSnapshot(snapInput, includeDemo);
  const customerName = new Map(snap.customers.map((customer) => [customer.id, customer.name]));
  const finances = new Map(snap.orders.map((order) => [order.id, orderFinance(order, snap.payments, snap.costLines)]));

  const inquiries = snap.inquiries.filter((inquiry) => inRange(inquiry.inquiry_date, range.from, range.to));
  const validInquiries = inquiries.filter((inquiry) => inquiry.is_valid);
  const periodOrders = snap.orders.filter((order) => inRange(order.order_date, range.from, range.to));
  const revenueOrders = periodOrders.filter((order) => finances.get(order.id)?.includedInRevenue);
  const paidOrders = revenueOrders.filter((order) => finances.get(order.id)?.validPaid);
  const northStarOrders = paidOrders.filter((order) => finances.get(order.id)?.positiveContribution);

  const quotedIds = new Set(
    snap.statusHistory
      .filter((event) => event.to_stage === "quoted" && inRange(shanghaiDate(event.changed_at), range.from, range.to))
      .map((event) => event.customer_id),
  );

  const paidCustomerIds = new Set(paidOrders.map((order) => order.customer_id));
  const validInquiryCustomerIds = new Set(validInquiries.map((inquiry) => inquiry.customer_id));
  const validToPaidNum = [...validInquiryCustomerIds].filter((id) => paidCustomerIds.has(id)).length;
  const quotedToPaidNum = [...quotedIds].filter((id) => paidCustomerIds.has(id)).length;

  let netSalesCents = 0;
  let profitBeforeCents = 0;
  let attributedAdCents = 0;
  let attributedOnPaidCents = 0;
  let unpaidCents = 0;
  let attributedPaidOrders = 0;
  for (const order of revenueOrders) {
    const finance = finances.get(order.id)!;
    netSalesCents += finance.netSalesCents;
    profitBeforeCents += finance.profitBeforeCents;
    unpaidCents += Math.max(0, finance.unpaidCents);
    if (finance.attributedAdCents != null) {
      attributedAdCents += finance.attributedAdCents;
      if (finance.validPaid) {
        attributedPaidOrders += 1;
        attributedOnPaidCents += finance.attributedAdCents;
      }
    }
  }

  const cashCollectedCents = sum(
    snap.payments
      .filter((payment) => inRange(payment.paid_on, range.from, range.to))
      .map((payment) => (payment.kind === "refund" ? -payment.amount_usd_cents : payment.amount_usd_cents)),
  );

  const periodAds = snap.ads.filter((ad) => inRange(ad.stat_date, range.from, range.to));
  const adSpendCents = sum(periodAds.map((ad) => ad.spend_usd_cents));
  const impressions = sum(periodAds.map((ad) => ad.impressions));
  const clicks = sum(periodAds.map((ad) => ad.clicks));
  const unattributedPortfolioCents = adSpendCents - attributedAdCents;

  const delivered = revenueOrders.filter((order) => inRange(deliveryDate(order), range.from, range.to));
  const reviewed = snap.orders.filter((order) => {
    if (!order.has_review) return false;
    const when = order.review_on || order.order_date;
    return inRange(when, range.from, range.to) && finances.get(order.id)?.includedInRevenue;
  });

  const days = eachDay(range.from, range.to);
  const series: DailyPoint[] = days.map((date) => ({
    date,
    inquiries: snap.inquiries.filter((inquiry) => inquiry.inquiry_date === date).length,
    validInquiries: snap.inquiries.filter((inquiry) => inquiry.inquiry_date === date && inquiry.is_valid).length,
    orders: snap.orders.filter((order) => order.order_date === date && finances.get(order.id)?.includedInRevenue).length,
    paidOrders: snap.orders.filter((order) => order.order_date === date && finances.get(order.id)?.validPaid).length,
    adSpendCents: sum(snap.ads.filter((ad) => ad.stat_date === date).map((ad) => ad.spend_usd_cents)),
  }));

  const channelMap = new Map<string, number>();
  for (const inquiry of inquiries) {
    channelMap.set(inquiry.platform, (channelMap.get(inquiry.platform) ?? 0) + 1);
  }
  const channels = [...channelMap.entries()]
    .map(([key, count]) => ({ key, label: PLATFORM_LABEL[key as Platform] ?? key, count }))
    .sort((a, b) => b.count - a.count);

  const productMap = new Map<string, ProductSlice>();
  for (const order of revenueOrders) {
    const current = productMap.get(order.product_code) ?? {
      key: order.product_code,
      label: PRODUCT_LABEL[order.product_code],
      orders: 0,
      netSalesCents: 0,
    };
    current.orders += 1;
    current.netSalesCents += finances.get(order.id)?.netSalesCents ?? 0;
    productMap.set(order.product_code, current);
  }
  const products = [...productMap.values()].sort((a, b) => b.netSalesCents - a.netSalesCents);

  const lostLatest = new Map<string, LostReason>();
  const lostEvents = snap.statusHistory
    .filter((event) => event.to_stage === "lost" && event.lost_reason && inRange(shanghaiDate(event.changed_at), range.from, range.to))
    .slice()
    .sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  for (const event of lostEvents) {
    if (event.lost_reason) lostLatest.set(event.customer_id, event.lost_reason);
  }
  const lostMap = new Map<string, number>();
  for (const reason of lostLatest.values()) lostMap.set(reason, (lostMap.get(reason) ?? 0) + 1);
  const lostReasons = [...lostMap.entries()]
    .map(([key, count]) => ({ key, label: LOST_REASON_LABEL[key as LostReason] ?? key, count }))
    .sort((a, b) => b.count - a.count);

  const stageMap = new Map<CustomerStage, number>();
  for (const stage of Object.keys(STAGE_LABEL) as CustomerStage[]) stageMap.set(stage, 0);
  for (const customer of snap.customers) stageMap.set(customer.stage, (stageMap.get(customer.stage) ?? 0) + 1);

  const openFollows = snap.followUps.filter((row) => !row.completed && row.next_follow_up_on);
  const toFollow = (row: FollowUp): FollowItem => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: customerName.get(row.customer_id) ?? "未知客户",
    task: row.task,
    nextOn: row.next_follow_up_on ?? "",
    intent: row.latest_intent,
  });

  const recentOrders: RecentOrder[] = snap.orders
    .slice()
    .sort((a, b) => b.order_date.localeCompare(a.order_date) || b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: customerName.get(order.customer_id) ?? "未知客户",
      status: order.status,
      orderDate: order.order_date,
      netSalesCents: finances.get(order.id)?.netSalesCents ?? 0,
      validPaid: finances.get(order.id)?.validPaid ?? false,
      isDemo: order.is_demo,
    }));

  const month = monthKey(today);
  const monthRange = { from: monthStart(today), to: today };
  const monthOrders = snap.orders.filter((order) => inRange(order.order_date, monthRange.from, monthRange.to));
  const monthPaid = monthOrders.filter((order) => finances.get(order.id)?.validPaid);
  const monthNorth = monthPaid.filter((order) => finances.get(order.id)?.positiveContribution);
  const targetValue = snap.targets[month];

  const funnel: FunnelStep[] = [
    {
      key: "inquiries",
      label: "新增询盘",
      count: inquiries.length,
      people: new Set(inquiries.map((inquiry) => inquiry.customer_id)).size,
      hint: "按询盘记录计，同一客户多次询盘分开计",
    },
    {
      key: "valid",
      label: "有效询盘",
      count: validInquiries.length,
      people: validInquiryCustomerIds.size,
      hint: "询盘上勾选了有效",
    },
    {
      key: "quoted",
      label: "已报价",
      count: quotedIds.size,
      people: quotedIds.size,
      hint: "区间内进入已报价的客户人数",
    },
    {
      key: "paid",
      label: "付费客户",
      count: paidOrders.length,
      people: paidCustomerIds.size,
      hint: "有效付费订单数，以及去重后的客户人数",
    },
    {
      key: "delivered",
      label: "交付",
      count: delivered.length,
      people: new Set(delivered.map((order) => order.customer_id)).size,
      hint: "按实际发货日；未填则已发货/已完成按订单日",
    },
    {
      key: "review",
      label: "评价推荐",
      count: reviewed.length,
      people: new Set(reviewed.map((order) => order.customer_id)).size,
      hint: "订单标记收到评价；未填评价日则按订单日",
    },
  ];

  const kpis = {
    inquiries: inquiries.length,
    validInquiries: validInquiries.length,
    inquiryCustomers: new Set(inquiries.map((inquiry) => inquiry.customer_id)).size,
    validInquiryCustomers: validInquiryCustomerIds.size,
    quotedCustomers: quotedIds.size,
    orders: revenueOrders.length,
    paidOrders: paidOrders.length,
    paidCustomers: paidCustomerIds.size,
    northStar: northStarOrders.length,
    deliveredOrders: delivered.length,
    reviewedOrders: reviewed.length,
    netSalesCents,
    cashCollectedCents,
    unpaidCents,
    adSpendCents,
    attributedAdCents,
    unattributedPortfolioCents,
    attributionOverflow: unattributedPortfolioCents < 0,
    profitBeforeCents,
    profitAfterAttributedCents: profitBeforeCents - attributedAdCents,
    marginBefore: netSalesCents !== 0 ? profitBeforeCents / netSalesCents : null,
    unattributedPaidOrders: paidOrders.length - attributedPaidOrders,
    attributedPaidOrders,
    blendedCacCents: ratio(adSpendCents, paidOrders.length),
    attributedCacCents: ratio(attributedOnPaidCents, attributedPaidOrders),
    impressions,
    clicks,
    ctr: ratio(clicks, impressions),
    posts: snap.posts.filter((post) => inRange(post.published_on, range.from, range.to)).length,
  };

  const empty =
    kpis.inquiries === 0 &&
    kpis.orders === 0 &&
    kpis.adSpendCents === 0 &&
    kpis.posts === 0 &&
    snap.customers.length === 0;

  return {
    kpis,
    validToPaid: rate(validToPaidNum, validInquiryCustomerIds.size),
    quotedToPaid: rate(quotedToPaidNum, quotedIds.size),
    cohort: computeCohort(snap, range, today),
    series,
    funnel,
    channels,
    products,
    lostReasons,
    stageCounts: [...stageMap.entries()].map(([key, count]) => ({ key, label: STAGE_LABEL[key], count })),
    followUpsToday: openFollows.filter((row) => row.next_follow_up_on === today).map(toFollow),
    followUpsOverdue: openFollows
      .filter((row) => row.next_follow_up_on != null && row.next_follow_up_on < today)
      .sort((a, b) => (a.next_follow_up_on ?? "").localeCompare(b.next_follow_up_on ?? ""))
      .map(toFollow),
    recentOrders,
    monthTarget: {
      month,
      target: targetValue == null ? null : targetValue,
      northStar: monthNorth.length,
      validPaid: monthPaid.length,
    },
    empty,
  };
}

export function countDemo(snap: Snapshot): number {
  return (
    snap.customers.filter((row) => row.is_demo).length +
    snap.orders.filter((row) => row.is_demo).length +
    snap.ads.filter((row) => row.is_demo).length +
    snap.posts.filter((row) => row.is_demo).length
  );
}

export { visibleCustomerIds };
