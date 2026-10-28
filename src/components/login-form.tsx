"use client";

import { signIn, signUp } from "@/app/actions/auth";
import { BindForm } from "@/components/bind-form";
import { Field } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RuntimeMode } from "@/lib/env";

export function LoginForm({ mode }: { mode: RuntimeMode }) {
  if (mode !== "supabase") return <SignInForm />;
  return (
    <Tabs defaultValue="login">
      <TabsList className="w-full">
        <TabsTrigger value="login">登录</TabsTrigger>
        <TabsTrigger value="register">注册</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <SignInForm />
      </TabsContent>
      <TabsContent value="register">
        <SignUpForm />
      </TabsContent>
    </Tabs>
  );
}

function SignInForm() {
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

function SignUpForm() {
  return (
    <BindForm action={signUp} className="grid gap-4">
      {(pending) => (
        <>
          <Field label="姓名" hint="可选。不填就用邮箱前缀。">
            <Input name="full_name" autoComplete="name" placeholder="你的名字" maxLength={80} />
          </Field>
          <Field label="邮箱">
            <Input name="email" type="email" autoComplete="email" required placeholder="you@deartuft.com" />
          </Field>
          <Field label="密码" hint="至少 6 位">
            <Input name="password" type="password" autoComplete="new-password" required minLength={6} />
          </Field>
          <p className="text-xs leading-5 text-muted-foreground">
            首位注册成功的账号会成为创始人。如果需要确认邮箱，请查收邮件后再登录。
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "注册中…" : "注册"}
          </Button>
        </>
      )}
    </BindForm>
  );
}
