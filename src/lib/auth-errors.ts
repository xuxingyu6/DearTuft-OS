const EMAIL_TAKEN = new Set(["user_already_exists", "email_exists", "identity_already_exists"]);
const RATE_LIMIT = new Set(["over_request_rate_limit", "over_email_send_rate_limit", "over_sms_send_rate_limit"]);
const SIGNUP_CLOSED = new Set(["signup_disabled", "email_provider_disabled"]);

export function signUpErrorMessage(error: { message?: string; code?: string }): string {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (
    EMAIL_TAKEN.has(code) ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ) {
    return "这个邮箱已经注册，请直接登录";
  }
  if (
    code === "weak_password" ||
    message.includes("password should be at least") ||
    message.includes("weak password") ||
    message.includes("password is known")
  ) {
    return "密码不符合要求，请换一个更长的密码";
  }
  if (
    code === "email_address_invalid" ||
    message.includes("unable to validate email") ||
    message.includes("invalid email") ||
    message.includes("invalid format")
  ) {
    return "邮箱格式不正确";
  }
  if (SIGNUP_CLOSED.has(code) || message.includes("signups not allowed") || message.includes("signup is disabled")) {
    return "当前没有开放注册";
  }
  if (code === "email_address_not_authorized") return "这个邮箱不在允许名单里";
  if (RATE_LIMIT.has(code) || message.includes("rate limit")) return "操作太频繁，请稍后再试";
  return "注册失败，请稍后再试";
}
