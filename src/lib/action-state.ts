export type ActionState = { error?: string; message?: string } | null;

export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function actionError(error: unknown): ActionState {
  if (error instanceof Error && error.message) return { error: error.message };
  return { error: "操作失败" };
}
