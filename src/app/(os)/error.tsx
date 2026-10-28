"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-6">
      <h1 className="text-lg font-semibold">这一页没有打开</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message || "请重试。如果是权限问题，用对应角色的账号登录。"}</p>
      <button type="button" className="mt-4 text-sm underline" onClick={() => reset()}>
        重试
      </button>
    </div>
  );
}
