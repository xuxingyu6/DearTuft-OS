import assert from "node:assert/strict";
import test from "node:test";

import { signUpErrorMessage } from "@/lib/auth-errors";

test("signup errors are Chinese", () => {
  assert.equal(signUpErrorMessage({ code: "user_already_exists" }), "这个邮箱已经注册，请直接登录");
  assert.equal(signUpErrorMessage({ message: "User already registered" }), "这个邮箱已经注册，请直接登录");
  assert.equal(signUpErrorMessage({ code: "weak_password", message: "Password should be at least 6 characters" }), "密码不符合要求，请换一个更长的密码");
  assert.equal(signUpErrorMessage({ code: "email_address_invalid" }), "邮箱格式不正确");
  assert.equal(signUpErrorMessage({ code: "signup_disabled" }), "当前没有开放注册");
  assert.equal(signUpErrorMessage({ code: "over_email_send_rate_limit" }), "操作太频繁，请稍后再试");
  assert.equal(signUpErrorMessage({ code: "email_address_not_authorized" }), "这个邮箱不在允许名单里");
  assert.equal(signUpErrorMessage({ message: "something unexpected" }), "注册失败，请稍后再试");
});
