import { LoginForm } from "@/components/login-form";
import { runtimeMode } from "@/lib/env";
import { LOCAL_USERS } from "@/lib/local-users";
import { ROLE_LABEL } from "@/lib/labels";

export default function LoginPage() {
  const mode = runtimeMode();
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">Dt</span>
          <div>
            <div className="text-lg font-semibold tracking-tight">DearTuft OS</div>
            <div className="text-sm text-muted-foreground">客户、订单、广告，同一本账</div>
          </div>
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          {mode === "unconfigured" ? (
            <p className="text-sm text-muted-foreground">
              还没有配置 Supabase。在 Vercel 或本地 `.env.local` 填入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY，然后重新部署。
            </p>
          ) : (
            <LoginForm />
          )}
        </div>
        {mode === "local" ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm">
            <div className="font-medium">本地演示账号</div>
            <p className="mt-1 text-xs text-muted-foreground">没有配置 Supabase 时使用。数据写在 data/local-db.json。这不是生产登录。</p>
            <ul className="mt-3 grid gap-1 text-xs">
              {LOCAL_USERS.map((user) => (
                <li key={user.email} className="flex justify-between gap-3 font-mono">
                  <span>{ROLE_LABEL[user.role]}</span>
                  <span>{user.email}</span>
                  <span>{user.password}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
