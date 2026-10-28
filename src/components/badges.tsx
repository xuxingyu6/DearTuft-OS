import { LOST_REASON_LABEL, ORDER_STATUS_LABEL, STAGE_LABEL } from "@/lib/labels";
import type { CustomerStage, LostReason, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const stageTone: Record<CustomerStage, string> = {
  new_inquiry: "bg-slate-100 text-slate-700",
  valid_inquiry: "bg-sky-50 text-sky-800",
  quoted: "bg-indigo-50 text-indigo-800",
  considering: "bg-amber-50 text-amber-900",
  pending_payment: "bg-orange-50 text-orange-900",
  paid: "bg-emerald-50 text-emerald-800",
  lost: "bg-rose-50 text-rose-800",
};

const orderTone: Record<OrderStatus, string> = {
  confirmed: "bg-indigo-50 text-indigo-800",
  in_production: "bg-amber-50 text-amber-900",
  shipped: "bg-sky-50 text-sky-800",
  completed: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
  refunded: "bg-rose-50 text-rose-800",
};

export function StageBadge({ stage }: { stage: CustomerStage }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", stageTone[stage])}>{STAGE_LABEL[stage]}</span>;
}

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", orderTone[status])}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function DemoBadge() {
  return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Demo</span>;
}

export function lostLabel(reason: LostReason | null, custom: string | null): string {
  if (!reason) return "—";
  if (reason === "other" && custom) return `其他：${custom}`;
  return LOST_REASON_LABEL[reason];
}
