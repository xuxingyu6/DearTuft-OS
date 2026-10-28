import type { Profile, Role } from "@/lib/types";

export type Action =
  | "customers.write"
  | "orders.read"
  | "orders.write"
  | "marketing.write"
  | "reviews.write"
  | "settings.read"
  | "finance.read"
  | "team.write";

const GRANTS: Record<Role, Action[] | ["*"]> = {
  admin: ["*"],
  cs: ["customers.write", "orders.read", "orders.write", "reviews.write", "finance.read"],
  content: ["marketing.write"],
};

export function can(role: Role, action: Action): boolean {
  const list = GRANTS[role];
  if (list[0] === "*") return true;
  return (list as Action[]).includes(action);
}

export function assertCan(role: Role, action: Action, message = "没有权限执行此操作"): void {
  if (!can(role, action)) throw new Error(message);
}

export function assertRoleChange(profiles: Pick<Profile, "id" | "role">[], targetId: string, next: Role) {
  const target = profiles.find((profile) => profile.id === targetId);
  if (!target) throw new Error("找不到这个成员");
  if (!["admin", "cs", "content"].includes(next)) throw new Error("角色无效");
  if (target.role === "admin" && next !== "admin") {
    const remaining = profiles.filter((profile) => profile.role === "admin" && profile.id !== targetId);
    if (remaining.length < 1) throw new Error("不能取消最后一位创始人");
  }
}
