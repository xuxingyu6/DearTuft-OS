"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { actionError, isRedirectError, type ActionState } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { field, parseCostLine, parseOrder, parsePayment } from "@/lib/parse";

function refresh(orderId?: string) {
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/weekly-review");
  revalidatePath("/monthly-review");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function saveOrder(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const input = parseOrder(form);
    const db = await getDb();
    const id = field(form, "id");
    if (id) {
      await db.updateOrder(id, input, user, form.get("refresh_fx") === "on");
      refresh(id);
      return { message: "订单已保存。汇率仍是原快照，除非你勾选了按当前汇率重记。" };
    }
    const newId = await db.insertOrder(input, user);
    refresh(newId);
    redirect(`/orders/${newId}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return actionError(error);
  }
}

export async function addPayment(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const orderId = field(form, "order_id");
  try {
    await (await getDb()).insertPayment(parsePayment(form), user);
    refresh(orderId);
    return { message: "款项已记下" };
  } catch (error) {
    return actionError(error);
  }
}

export async function removePayment(form: FormData): Promise<void> {
  const user = await requireUser();
  await (await getDb()).deletePayment(field(form, "id"), user);
  refresh(field(form, "order_id"));
}

export async function addCostLine(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const orderId = field(form, "order_id");
  try {
    await (await getDb()).insertCostLine(parseCostLine(form), user);
    refresh(orderId);
    return { message: "费用已追加。请不要把订单主成本再填一遍。" };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeCostLine(form: FormData): Promise<void> {
  const user = await requireUser();
  await (await getDb()).deleteCostLine(field(form, "id"), user);
  refresh(field(form, "order_id"));
}
