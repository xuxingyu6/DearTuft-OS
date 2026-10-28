import { cnyFenToUsdCents } from "@/lib/money";
import type { CostLine, Order, OrderStatus, Payment } from "@/lib/types";

/**
 * Order economics. All outputs are integer USD cents unless noted.
 *
 * amount due (应付)        = gross − discount
 * refunds                  = sum of refund payments
 * receipts                 = sum of non-refund payments
 * net sales (净销售额)      = amount due − refunds
 * cash collected (累计收款) = receipts − refunds
 * unpaid (未收余额)         = amount due − receipts
 *   Refunds do not increase unpaid. A fully collected order that is
 *   later partly refunded stays at unpaid 0; net sales and cash fall.
 *
 * variable cost            = production + shipping + payment fee + other
 *   Header costs: production/shipping/other in CNY fen, fee in USD cents.
 *   Extra cost lines add on top. Do not enter the same cost twice.
 *   Attributed ad lines are NOT part of variable cost.
 *
 * profit before ads        = net sales − variable cost
 * profit after attributed  = profit before ads − attributed ad cost
 *   Null when no attributed ad line exists (未归因). Never spread
 *   portfolio ad spend across orders.
 *
 * Valid paid order: status is confirmed / in production / shipped /
 * completed, and either receipts cover amount due, or the agreed
 * deposit is covered by deposit + full payments.
 * Cancelled and refunded orders are not valid paid orders.
 * Cancelled orders are excluded from period revenue.
 */
export type OrderFinance = {
  amountDueCents: number;
  refundCents: number;
  receiptCents: number;
  netSalesCents: number;
  cashCollectedCents: number;
  unpaidCents: number;
  productionUsdCents: number;
  shippingUsdCents: number;
  paymentFeeUsdCents: number;
  otherUsdCents: number;
  variableUsdCents: number;
  attributedAdCents: number | null;
  profitBeforeCents: number;
  profitAfterAttributedCents: number | null;
  marginBefore: number | null;
  marginAfter: number | null;
  depositPaidCents: number;
  fullyPaid: boolean;
  depositSatisfied: boolean;
  validPaid: boolean;
  positiveContribution: boolean;
  includedInRevenue: boolean;
};

const ACTIVE: OrderStatus[] = ["confirmed", "in_production", "shipped", "completed"];

export function orderFinance(order: Order, payments: Payment[], lines: CostLine[]): OrderFinance {
  const pays = payments.filter((payment) => payment.order_id === order.id);
  const extras = lines.filter((line) => line.order_id === order.id);
  const fx = order.fx_cny_per_usd_e6;

  const refundCents = sum(pays.filter((payment) => payment.kind === "refund").map((payment) => payment.amount_usd_cents));
  const receiptCents = sum(pays.filter((payment) => payment.kind !== "refund").map((payment) => payment.amount_usd_cents));
  const depositPaidCents = sum(
    pays.filter((payment) => payment.kind === "deposit" || payment.kind === "full").map((payment) => payment.amount_usd_cents),
  );

  const amountDueCents = order.gross_amount_usd_cents - order.discount_usd_cents;
  const netSalesCents = amountDueCents - refundCents;
  const cashCollectedCents = receiptCents - refundCents;
  const unpaidCents = amountDueCents - receiptCents;

  let productionFen = order.production_cost_cny_fen;
  let shippingFen = order.shipping_cost_cny_fen;
  let otherFen = order.other_cost_cny_fen;
  let paymentFeeUsdCents = order.payment_fee_usd_cents;
  let extraUsdCents = 0;
  let attributedAdCents: number | null = null;

  for (const line of extras) {
    const asUsd = line.currency === "USD" ? line.amount_minor : cnyFenToUsdCents(line.amount_minor, fx);
    if (line.category === "attributed_ad") {
      attributedAdCents = (attributedAdCents ?? 0) + asUsd;
      continue;
    }
    if (line.category === "payment_fee") {
      paymentFeeUsdCents += asUsd;
      continue;
    }
    if (line.currency === "CNY") {
      if (line.category === "production") productionFen += line.amount_minor;
      else if (line.category === "shipping") shippingFen += line.amount_minor;
      else otherFen += line.amount_minor;
    } else {
      extraUsdCents += asUsd;
    }
  }

  const productionUsdCents = cnyFenToUsdCents(productionFen, fx);
  const shippingUsdCents = cnyFenToUsdCents(shippingFen, fx);
  const otherUsdCents = cnyFenToUsdCents(otherFen, fx);
  const variableUsdCents = productionUsdCents + shippingUsdCents + paymentFeeUsdCents + otherUsdCents + extraUsdCents;
  const profitBeforeCents = netSalesCents - variableUsdCents;
  const profitAfterAttributedCents =
    attributedAdCents == null ? null : profitBeforeCents - attributedAdCents;
  const marginBefore = netSalesCents !== 0 ? profitBeforeCents / netSalesCents : null;
  const marginAfter =
    profitAfterAttributedCents == null || netSalesCents === 0
      ? null
      : profitAfterAttributedCents / netSalesCents;

  const fullyPaid = amountDueCents > 0 && receiptCents >= amountDueCents;
  const depositSatisfied = order.agreed_deposit_usd_cents > 0 && depositPaidCents >= order.agreed_deposit_usd_cents;
  const includedInRevenue = order.status !== "cancelled";
  const validPaid = includedInRevenue && order.status !== "refunded" && ACTIVE.includes(order.status) && (fullyPaid || depositSatisfied);
  const positiveContribution = validPaid && profitBeforeCents > 0;

  return {
    amountDueCents,
    refundCents,
    receiptCents,
    netSalesCents,
    cashCollectedCents,
    unpaidCents,
    productionUsdCents,
    shippingUsdCents,
    paymentFeeUsdCents,
    otherUsdCents,
    variableUsdCents,
    attributedAdCents,
    profitBeforeCents,
    profitAfterAttributedCents,
    marginBefore,
    marginAfter,
    depositPaidCents,
    fullyPaid,
    depositSatisfied,
    validPaid,
    positiveContribution,
    includedInRevenue,
  };
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function deliveryDate(order: Order): string | null {
  if (order.status === "cancelled" || order.status === "refunded") return null;
  if (order.actual_ship_date) return order.actual_ship_date;
  if (order.status === "shipped" || order.status === "completed") return order.order_date;
  return null;
}
