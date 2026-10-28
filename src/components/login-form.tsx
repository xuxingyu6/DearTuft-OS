"use client";

import { signIn } from "@/app/actions/auth";
import { BindForm } from "@/components/bind-form";
import { Field } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  return (
    <BindForm action={signIn} className="grid gap-4">
      {(pending) => (
        <>
          <Field label="邮箱">
            <Input name="email" type="email" autoComplete="username" required placeholder="you@deartuft.com" />
          </Field>
          <Field label="密码">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "登录中…" : "登录"}
          </Button>
        </>
      )}
    </BindForm>
  );
}
