"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { findLocalAccount, passwordsMatch } from "@/lib/auth";
import { signUpErrorMessage } from "@/lib/auth-errors";
import { actionError, isRedirectError, type ActionState } from "@/lib/action-state";
import { runtimeMode } from "@/lib/env";
import { field } from "@/lib/parse";
import { LOCAL_COOKIE, signSession } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = field(form, "email").toLowerCase();
  const password = field(form, "password");
  const fullName = field(form, "full_name");
  if (!email || !password) return { error: "请填写邮箱和密码" };
  if (!EMAIL_PATTERN.test(email)) return { error: "邮箱格式不正确" };
  if (password.length < 6) return { error: "密码至少需要 6 位" };
  if (fullName.length > 80) return { error: "姓名请控制在 80 字以内" };

  const mode = runtimeMode();
  if (mode === "unconfigured") return { error: "生产环境还没有配置 Supabase" };
  if (mode !== "supabase") return { error: "本地演示请使用页面上的账号登录" };

  try {
    const supabase = await createSupabaseServer();
    // handle_new_user() makes the first account admin and ignores later admin requests.
    const data: { role: "admin"; full_name?: string } = { role: "admin" };
    if (fullName) data.full_name = fullName;
    const { data: result, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data },
    });
    if (error) return { error: signUpErrorMessage(error) };
    if (result.session) redirect("/");
    return { message: "注册已提交。如果需要确认邮箱，请查收邮件后再登录；也可以直接尝试登录。" };
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
