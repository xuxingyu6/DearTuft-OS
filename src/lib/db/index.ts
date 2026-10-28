import "server-only";

import { runtimeMode } from "@/lib/env";
import type { Database } from "@/lib/db/types";
import { createLocalDb } from "@/lib/db/local";
import { createSupabaseDb } from "@/lib/db/supabase";

export async function getDb(): Promise<Database> {
  const mode = runtimeMode();
  if (mode === "supabase") return createSupabaseDb();
  if (mode === "local") return createLocalDb();
  throw new Error("未配置 Supabase。在 Vercel 上需要 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
}

export type { Database };
