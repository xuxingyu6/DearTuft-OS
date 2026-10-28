import type { Role } from "@/lib/types";

export type LocalAccount = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
};

/** Dev-only accounts. Ignored when Supabase env vars are set. */
export const LOCAL_USERS: LocalAccount[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@deartuft.local",
    password: "deartuft-admin",
    fullName: "创始人",
    role: "admin",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "cs@deartuft.local",
    password: "deartuft-cs",
    fullName: "客服",
    role: "cs",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    email: "content@deartuft.local",
    password: "deartuft-content",
    fullName: "内容",
    role: "content",
  },
];
