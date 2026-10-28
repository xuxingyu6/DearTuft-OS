"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { findLocalAccount, passwordsMatch } from "@/lib/auth";
import { actionError, isRedirectError, type ActionState } from "@/lib/action-state";
import { runtimeMode } from "@/lib/env";
import { field } from "@/lib/parse";
import { LOCAL_COOKIE, signSession } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = field(form, "email").toLowerCase();
  const password = field(form, "password");
  if (!email || !password) return { error: "请填写邮箱和密码" };
  const mode = runtimeMode();
  if (mode === "unconfigured") return { error: "生产环境还没有配置 Supabase" };
  try {
    if (mode === "local") {
      const account = findLocalAccount(email);
      if (!account || !passwordsMatch(password, account.password)) return { error: "邮箱或密码不正确" };
      const token = await signSession(account.id);
      (await cookies()).set(LOCAL_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      redirect("/");
    }
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "邮箱或密码不正确" };
    redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return actionError(error);
  }
}

export async function signOut(): Promise<void> {
  if (runtimeMode() === "supabase") {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  } else {
    (await cookies()).set(LOCAL_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  }
  redirect("/login");
}
