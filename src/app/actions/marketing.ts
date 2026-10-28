"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { actionError, type ActionState } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { field, parseAd, parsePost } from "@/lib/parse";

function refresh() {
  revalidatePath("/");
  revalidatePath("/marketing");
  revalidatePath("/weekly-review");
  revalidatePath("/monthly-review");
}

export async function saveAd(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const input = parseAd(form);
    const db = await getDb();
    const id = field(form, "id");
    if (id) await db.updateAd(id, input, user);
    else await db.insertAd(input, user);
    refresh();
    return { message: id ? "广告记录已更新" : "广告记录已添加" };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeAd(form: FormData): Promise<void> {
  const user = await requireUser();
  await (await getDb()).deleteAd(field(form, "id"), user);
  refresh();
}

export async function savePost(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const input = parsePost(form);
    const db = await getDb();
    const id = field(form, "id");
    if (id) await db.updatePost(id, input, user);
    else await db.insertPost(input, user);
    refresh();
    return { message: id ? "内容已更新" : "内容已添加" };
  } catch (error) {
    return actionError(error);
  }
}

export async function removePost(form: FormData): Promise<void> {
  const user = await requireUser();
  await (await getDb()).deletePost(field(form, "id"), user);
  refresh();
}
