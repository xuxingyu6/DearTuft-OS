export type RuntimeMode = "supabase" | "local" | "unconfigured";

export function runtimeMode(): RuntimeMode {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "supabase";
  }
  if (process.env.VERCEL) return "unconfigured";
  return "local";
}

export function sessionSecret(): string {
  return process.env.LOCAL_SESSION_SECRET || "deartuft-local-dev-only-not-for-production";
}
