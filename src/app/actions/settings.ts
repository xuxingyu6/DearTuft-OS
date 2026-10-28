"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { actionError, type ActionState } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { parseFxToE6 } from "@/lib/money";
import { field } from "@/lib/parse";
import type { Role } from "@/lib/types";

function refresh() {
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/orders");
}

export async function saveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const fxE6 = parseFxToE6(field(form, "fx"));
    const months = form.getAll("target_month").filter((value): value is string => typeof value === "string");
    const counts = form.getAll("target_count").filter((value): value is string => typeof value === "string");
    const targets: Record<string, number> = {};
    months.forEach((month, index) => {
      if (!/^\d{4}-\d{2}$/.test(month)) return;
      const count = Number(counts[index] ?? "");
      if (!Number.isFinite(count) || count < 0) throw new Error(`${month} 的目标必须是大于等于 0 的整数`);
      targets[month] = Math.round(count);
    });
    await (await getDb()).updateSettings(fxE6, targets, user);
    refresh();
    return { message: "设置已保存。已有订单的汇率快照不会自动改写。" };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const role = field(form, "role") as Role;
    await (await getDb()).updateRole(field(form, "profile_id"), role, user);
    revalidatePath("/settings");
    return { message: "角色已更新。对方需要重新登录后才会按新角色进入。" };
  } catch (error) {
    return actionError(error);
  }
}

export async function loadDemoData(): Promise<void> {
  const user = await requireUser();
  await (await getDb()).loadDemo(user);
  refresh();
  revalidatePath("/customers");
  revalidatePath("/marketing");
  revalidatePath("/orders");
}

export async function clearDemoData(): Promise<void> {
  const user = await requireUser();
  await (await getDb()).clearDemo(user);
  refresh();
  revalidatePath("/customers");
  revalidatePath("/marketing");
  revalidatePath("/orders");
}
