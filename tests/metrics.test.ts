import assert from "node:assert/strict";
import test from "node:test";

import { buildDemoRecords } from "@/lib/demo-data";
import { orderFinance } from "@/lib/finance";
import { normalizeInstagram } from "@/lib/instagram";
import { adMetrics, computeCohort, computeDashboard, scopeSnapshot } from "@/lib/metrics";
import { cnyFenToUsdCents, DEFAULT_TARGETS, parseFxToE6 } from "@/lib/money";
import { parseCustomer } from "@/lib/parse";
import { assertRoleChange, can } from "@/lib/permissions";
import { readSession, signSession } from "@/lib/session";
import type { CostLine, Snapshot } from "@/lib/types";

const TODAY = "2026-10-27";
const MONTH = { from: "2026-10-01", to: TODAY };

function snap(partial: Partial<Snapshot> = {}): Snapshot {
  return {
    profiles: [],
    customers: [],
    statusHistory: [],
    inquiries: [],
    followUps: [],
    orders: [],
    payments: [],
    costLines: [],
    ads: [],
    posts: [],
    weeklyReviews: [],
    monthlyReviews: [],
    fxE6: 7_200_000,
    targets: { ...DEFAULT_TARGETS },
    ...partial,
  };
}

function demoSnap(today = TODAY): Snapshot {
  const demo = buildDemoRecords(today);
  return snap({
    customers: demo.customers,
    inquiries: demo.inquiries,
    followUps: demo.followUps,
    orders: demo.orders,
    payments: demo.payments,
    statusHistory: demo.history,
    ads: demo.ads,
    posts: demo.posts,
  });
}

test("FX converts fen to cents without floating storage", () => {
  assert.equal(parseFxToE6("7.20"), 7_200_000);
  assert.equal(cnyFenToUsdCents(40_000, 7_200_000), 5556);
  assert.equal(cnyFenToUsdCents(8_000, 7_200_000), 1111);
  assert.equal(DEFAULT_TARGETS["2026-11"], 2);
  assert.equal(DEFAULT_TARGETS["2026-12"], 5);
  assert.equal(DEFAULT_TARGETS["2027-01"], 8);
});

test("demo order separates net sales, cash, unpaid, and profit before ads", () => {
  const demo = buildDemoRecords(TODAY);
  const finance = orderFinance(demo.orders[0]!, demo.payments, []);
  assert.equal(finance.amountDueCents, 17_900);
  assert.equal(finance.netSalesCents, 17_900);
  assert.equal(finance.cashCollectedCents, 6_000);
  assert.equal(finance.unpaidCents, 11_900);
  assert.equal(finance.productionUsdCents, 5556);
  assert.equal(finance.shippingUsdCents, 1111);
  assert.equal(finance.variableUsdCents, 6727);
  assert.equal(finance.profitBeforeCents, 11_173);
  assert.equal(finance.profitAfterAttributedCents, null);
  assert.equal(finance.validPaid, true);
  assert.equal(finance.positiveContribution, true);
  assert.equal(finance.attributedAdCents, null);
});

test("a refund lowers net sales and cash, and does not increase unpaid", () => {
  const demo = buildDemoRecords(TODAY);
  const order = demo.orders[0]!;
  const refund = { ...demo.payments[0]!, id: "refund", kind: "refund" as const, amount_usd_cents: 1_000 };
  const finance = orderFinance(order, [...demo.payments, refund], []);
  assert.equal(finance.netSalesCents, 16_900);
  assert.equal(finance.cashCollectedCents, 5_000);
  assert.equal(finance.unpaidCents, 11_900);
  assert.equal(finance.validPaid, true);
});

test("cancelled orders leave revenue; refunded orders are not valid paid", () => {
  const demo = buildDemoRecords(TODAY);
  const cancelled = orderFinance({ ...demo.orders[0]!, status: "cancelled" }, demo.payments, []);
  assert.equal(cancelled.includedInRevenue, false);
  assert.equal(cancelled.validPaid, false);
  const refunded = orderFinance({ ...demo.orders[0]!, status: "refunded" }, demo.payments, []);
  assert.equal(refunded.includedInRevenue, true);
  assert.equal(refunded.validPaid, false);
  assert.equal(refunded.positiveContribution, false);
});

test("attributed ad cost is optional and is not mixed into variable cost", () => {
  const demo = buildDemoRecords(TODAY);
  const line: CostLine = {
    id: "cost",
    order_id: demo.orders[0]!.id,
    category: "attributed_ad",
    currency: "USD",
    amount_minor: 500,
    note: null,
    created_by: null,
    created_at: "2026-10-23T00:00:00.000Z",
  };
  const finance = orderFinance(demo.orders[0]!, demo.payments, [line]);
  assert.equal(finance.variableUsdCents, 6727);
  assert.equal(finance.attributedAdCents, 500);
  assert.equal(finance.profitBeforeCents, 11_173);
  assert.equal(finance.profitAfterAttributedCents, 10_673);
});

test("portfolio ad spend is not allocated onto orders", () => {
  const model = computeDashboard(demoSnap(), MONTH, TODAY, true);
  assert.equal(model.kpis.inquiries, 3);
  assert.equal(model.kpis.validInquiries, 2);
  assert.equal(model.kpis.paidOrders, 1);
  assert.equal(model.kpis.northStar, 1);
  assert.equal(model.kpis.netSalesCents, 17_900);
  assert.equal(model.kpis.cashCollectedCents, 6_000);
  assert.equal(model.kpis.unpaidCents, 11_900);
  assert.equal(model.kpis.adSpendCents, 2_000);
  assert.equal(model.kpis.profitBeforeCents, 11_173);
  assert.equal(model.kpis.attributedAdCents, 0);
  assert.equal(model.kpis.profitAfterAttributedCents, 11_173);
  assert.equal(model.kpis.blendedCacCents, 2_000);
  assert.equal(model.kpis.attributedCacCents, null);
  assert.equal(model.kpis.attributionOverflow, false);
  assert.equal(model.followUpsToday.length, 1);
  assert.equal(model.followUpsOverdue.length, 1);
  assert.equal(model.validToPaid.num, 1);
  assert.equal(model.validToPaid.den, 2);
  assert.equal(model.quotedToPaid.den, 1);
  assert.equal(model.quotedToPaid.num, 0);
  assert.equal(model.lostReasons[0]?.key, "price_high");
  assert.equal(model.monthTarget.target, null);
  assert.equal(model.monthTarget.northStar, 1);
});

test("demo rows stay out of operating metrics until included", () => {
  const hidden = computeDashboard(demoSnap(), MONTH, TODAY, false);
  assert.equal(hidden.kpis.inquiries, 0);
  assert.equal(hidden.kpis.paidOrders, 0);
  assert.equal(hidden.kpis.adSpendCents, 0);
  assert.equal(hidden.kpis.netSalesCents, 0);
  assert.equal(hidden.empty, true);
});

test("content snapshot cannot see orders, so finance KPIs stay empty", () => {
  const model = computeDashboard(scopeSnapshot(demoSnap(), "content"), MONTH, TODAY, true);
  assert.equal(model.kpis.inquiries, 3);
  assert.equal(model.kpis.paidOrders, 0);
  assert.equal(model.kpis.netSalesCents, 0);
  assert.equal(model.kpis.adSpendCents, 2_000);
  assert.equal(model.recentOrders.length, 0);
  assert.equal(can("content", "orders.read"), false);
  assert.equal(can("content", "marketing.write"), true);
  assert.equal(can("cs", "settings.read"), false);
  assert.equal(can("cs", "orders.write"), true);
  assert.equal(can("admin", "settings.read"), true);
});

test("attributed spend above portfolio spend is shown, not clamped", () => {
  const base = demoSnap();
  const orderId = base.orders[0]!.id;
  const line: CostLine = {
    id: "cost",
    order_id: orderId,
    category: "attributed_ad",
    currency: "USD",
    amount_minor: 3_000,
    note: null,
    created_by: null,
    created_at: "2026-10-23T00:00:00.000Z",
  };
  const model = computeDashboard({ ...base, costLines: [line] }, MONTH, TODAY, true);
  assert.equal(model.kpis.adSpendCents, 2_000);
  assert.equal(model.kpis.attributedAdCents, 3_000);
  assert.equal(model.kpis.attributionOverflow, true);
  assert.equal(model.kpis.profitBeforeCents, 11_173);
  assert.equal(model.kpis.profitAfterAttributedCents, 8_173);
  assert.equal(model.kpis.attributedCacCents, 3_000);
  assert.equal(model.kpis.blendedCacCents, 2_000);
});

test("ad ratios are null when the denominator is zero", () => {
  const metrics = adMetrics({
    spend_usd_cents: 0,
    impressions: 0,
    clicks: 0,
    new_inquiries: 0,
    valid_inquiries: 0,
    attributed_orders: 0,
  });
  assert.equal(metrics.cpmCents, null);
  assert.equal(metrics.cpcCents, null);
  assert.equal(metrics.ctr, null);
  assert.equal(metrics.costPerInquiryCents, null);
  assert.equal(metrics.cacCents, null);
});

test("cohort rates only count windows that have already closed", () => {
  const demo = buildDemoRecords(TODAY);
  const early = {
    ...demo.customers[0]!,
    id: "c-early",
    is_demo: false,
    first_inquiry_date: "2026-08-01",
    name: "Early",
  };
  const late = {
    ...demo.customers[1]!,
    id: "c-late",
    is_demo: false,
    first_inquiry_date: "2026-10-01",
    name: "Late",
  };
  const slow = {
    ...demo.customers[2]!,
    id: "c-slow",
    is_demo: false,
    first_inquiry_date: "2026-08-01",
    stage: "paid" as const,
    lost_reason: null,
    name: "Slow",
  };
  const paidEarly = {
    ...demo.orders[0]!,
    id: "o-early",
    customer_id: early.id,
    is_demo: false,
    order_date: "2026-08-20",
  };
  const paidSlow = {
    ...demo.orders[0]!,
    id: "o-slow",
    customer_id: slow.id,
    is_demo: false,
    order_date: "2026-09-15",
  };
  const payments = [
    { ...demo.payments[0]!, id: "p-early", order_id: paidEarly.id, paid_on: paidEarly.order_date },
    { ...demo.payments[0]!, id: "p-slow", order_id: paidSlow.id, paid_on: paidSlow.order_date },
  ];
  const cohort = computeCohort(
    snap({
      customers: [early, late, slow],
      orders: [paidEarly, paidSlow],
      payments,
    }),
    { from: "2026-08-01", to: TODAY },
    TODAY,
  );
  assert.equal(cohort.customers, 3);
  assert.equal(cohort.closed30, 2);
  assert.equal(cohort.paid30, 1);
  assert.equal(cohort.closed60, 2);
  assert.equal(cohort.paid60, 2);
  assert.equal(cohort.paidSoFar, 2);
  assert.equal(cohort.rate30, 0.5);
  assert.equal(cohort.rate60, 1);
});

test("instagram handles normalize and lost customers need a reason", () => {
  assert.equal(normalizeInstagram("  @Demo_Luna "), "demo_luna");
  assert.equal(normalizeInstagram("@@A B!"), "ab");
  assert.equal(normalizeInstagram("中文"), null);
  const form = new FormData();
  form.set("name", "Kiki");
  form.set("stage", "lost");
  assert.throws(() => parseCustomer(form), /流失/);
});

test("the last admin cannot be demoted", () => {
  const profiles = [{ id: "a", role: "admin" as const }, { id: "b", role: "cs" as const }];
  assert.throws(() => assertRoleChange(profiles, "a", "cs"), /最后一位创始人/);
  assert.doesNotThrow(() => assertRoleChange([...profiles, { id: "c", role: "admin" }], "a", "content"));
});

test("local session cookie round-trips", async () => {
  const token = await signSession("00000000-0000-4000-8000-000000000001");
  assert.equal((await readSession(token))?.sub, "00000000-0000-4000-8000-000000000001");
  assert.equal(await readSession(`${token}x`), null);
  assert.equal(await readSession("not-a-token"), null);
});
