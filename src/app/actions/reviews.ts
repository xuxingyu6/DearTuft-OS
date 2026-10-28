"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { actionError, type ActionState } from "@/lib/action-state";
import { isMonday, isYmd, monthStart } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { field, parseMonthly, parseWeekly } from "@/lib/parse";

export async function saveWeeklyReview(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const week = field(form, "week_start");
    if (!isYmd(week) || !isMonday(week)) throw new Error("周复盘必须从周一开始");
    await (await getDb()).saveWeekly(week, parseWeekly(form), user);
    revalidatePath("/weekly-review");
    return { message: "本周复盘已保存" };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveMonthlyReview(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const month = field(form, "month_start");
    if (!isYmd(month) || month !== monthStart(month)) throw new Error("请选择月份的第一天");
    await (await getDb()).saveMonthly(month, parseMonthly(form), user);
    revalidatePath("/monthly-review");
    return { message: "本月复盘已保存" };
  } catch (error) {
    return actionError(error);
  }
}
