"use client";

import { useActionState } from "react";

import { Notice } from "@/components/bits";
import type { ActionState } from "@/lib/action-state";

export function BindForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode | ((pending: boolean) => React.ReactNode);
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {state?.error ? <Notice>{state.error}</Notice> : null}
      {state?.message ? <Notice tone="ok">{state.message}</Notice> : null}
      {typeof children === "function" ? children(pending) : children}
    </form>
  );
}
