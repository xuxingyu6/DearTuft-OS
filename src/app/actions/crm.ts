"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { actionError, isRedirectError, type ActionState } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { field, parseCustomer, parseFollowUp, parseInquiry, parseOptionalInquiry } from "@/lib/parse";

function refreshCustomer(id?: string) {
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/weekly-review");
  revalidatePath("/monthly-review");
  if (id) revalidatePath(`/customers/${id}`);
}

export async function saveCustomer(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const input = parseCustomer(form);
    const db = await getDb();
    const id = field(form, "id");
    if (id) {
      await db.updateCustomer(id, input, user);
      refreshCustomer(id);
      return { message: "客户已保存" };
    }
    const newId = await db.insertCustomer(input, user, parseOptionalInquiry(form));
    refreshCustomer(newId);
    redirect(`/customers/${newId}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return actionError(error);
  }
}

export async function removeCustomer(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = field(form, "id");
  const db = await getDb();
  await db.deleteCustomer(id, user);
  refreshCustomer();
  redirect("/customers");
}

export async function addInquiry(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const customerId = field(form, "customer_id");
  try {
    await (await getDb()).insertInquiry(customerId, parseInquiry(form), user);
    refreshCustomer(customerId);
    return { message: "询盘已记录" };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleInquiry(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = field(form, "id");
  const customerId = field(form, "customer_id");
  await (await getDb()).setInquiryValid(id, field(form, "is_valid") === "true", user);
  refreshCustomer(customerId);
}

export async function removeInquiry(form: FormData): Promise<void> {
  const user = await requireUser();
  await (await getDb()).deleteInquiry(field(form, "id"), user);
  refreshCustomer(field(form, "customer_id"));
}

export async function addFollowUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const customerId = field(form, "customer_id");
  try {
    await (await getDb()).insertFollowUp(customerId, parseFollowUp(form), user);
    refreshCustomer(customerId);
    return { message: "跟进已记下" };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleFollowUp(form: FormData): Promise<void> {
  const user = await requireUser();
  await (await getDb()).setFollowUpCompleted(field(form, "id"), field(form, "completed") === "true", user);
  refreshCustomer(field(form, "customer_id"));
}

export async function removeFollowUp(form: FormData): Promise<void> {
  const user = await requireUser();
  await (await getDb()).deleteFollowUp(field(form, "id"), user);
  refreshCustomer(field(form, "customer_id"));
}
