import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { runtimeMode } from "@/lib/env";
import { LOCAL_USERS } from "@/lib/local-users";
import { LOCAL_COOKIE, readSession } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types";

export function passwordsMatch(input: string, expected: string): boolean {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const mode = runtimeMode();
  if (mode === "local") {
    const token = (await cookies()).get(LOCAL_COOKIE)?.value;
    const session = await readSession(token);
    if (!session) return null;
    const snapshot = await (await getDb()).loadSnapshot();
    const profile = snapshot.profiles.find((row) => row.id === session.sub);
    if (!profile) return null;
    return { id: profile.id, email: profile.email, fullName: profile.full_name, role: profile.role };
  }
  if (mode !== "supabase") return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const profile = await supabase.from("profiles").select("id, email, full_name, role").eq("id", data.user.id).maybeSingle();
  if (profile.error || !profile.data) return null;
  return {
    id: profile.data.id,
    email: profile.data.email,
    fullName: profile.data.full_name,
    role: profile.data.role,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function findLocalAccount(email: string) {
  return LOCAL_USERS.find((user) => user.email === email.toLowerCase());
}
