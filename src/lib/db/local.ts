import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { shanghaiToday } from "@/lib/dates";
import { buildDemoRecords } from "@/lib/demo-data";
import { normalizeInstagram } from "@/lib/instagram";
import { LOCAL_USERS } from "@/lib/local-users";
import { DEFAULT_FX_E6, DEFAULT_TARGETS } from "@/lib/money";
import { assertCan, assertRoleChange } from "@/lib/permissions";
import type {
  AdInput,
  CostLineInput,
  Customer,
  CustomerInput,
  FollowUpInput,
  InquiryInput,
  MonthlyAnswers,
  OrderInput,
  PaymentInput,
  PostInput,
  Profile,
  Role,
  SessionUser,
  Snapshot,
  WeeklyAnswers,
} from "@/lib/types";
import type { Database } from "@/lib/db/types";

type LocalFile = Snapshot & { version: 1; orderSeq: number };

const filePath = path.join(process.cwd(), "data", "local-db.json");

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function emptyFile(): LocalFile {
  const now = new Date().toISOString();
  const profiles: Profile[] = LOCAL_USERS.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    created_at: now,
    updated_at: now,
  }));
  return {
    version: 1,
    profiles,
    customers: [],
    statusHistory: [],
    inquiries: [],
    followUps: [],
    orders: [],
    payments: [],
    costLines: [],
    ads: [],
    posts: [],
    weeklyReviews: [],
    monthlyReviews: [],
    fxE6: DEFAULT_FX_E6,
    targets: { ...DEFAULT_TARGETS },
    orderSeq: 1,
  };
}

async function readDb(): Promise<LocalFile> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as LocalFile;
    if (!parsed.profiles?.length) {
      const fresh = emptyFile();
      parsed.profiles = fresh.profiles;
    }
    parsed.targets = { ...DEFAULT_TARGETS, ...parsed.targets };
    return parsed;
  } catch {
    const fresh = emptyFile();
    await writeDb(fresh);
    return fresh;
  }
}

async function writeDb(db: LocalFile): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, filePath);
}

function snapshotOf(db: LocalFile): Snapshot {
  return {
    profiles: db.profiles,
    customers: db.customers,
    statusHistory: db.statusHistory,
    inquiries: db.inquiries,
    followUps: db.followUps,
    orders: db.orders,
    payments: db.payments,
    costLines: db.costLines,
    ads: db.ads,
    posts: db.posts,
    weeklyReviews: db.weeklyReviews,
    monthlyReviews: db.monthlyReviews,
    fxE6: db.fxE6,
    targets: db.targets,
  };
}

function assertHandle(db: LocalFile, handle: string | null, exceptId?: string) {
  const norm = normalizeInstagram(handle);
  if (!norm) return;
  const clash = db.customers.find((customer) => customer.instagram_handle_norm === norm && customer.id !== exceptId);
  if (clash) throw new Error(`该 Instagram 账号已有客户「${clash.name}」，不能重复建档`);
}

function toCustomer(input: CustomerInput, existing: Customer | undefined, userId: string, now: string): Customer {
  return {
    ...input,
    id: existing?.id ?? randomUUID(),
    instagram_handle_norm: normalizeInstagram(input.instagram_handle),
    lost_reason: input.stage === "lost" ? input.lost_reason : null,
    lost_reason_custom: input.stage === "lost" ? input.lost_reason_custom : null,
    is_demo: existing?.is_demo ?? false,
    created_by: existing?.created_by ?? userId,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export function createLocalDb(): Database {
  return {
    mode: "local",
    async loadSnapshot() {
      return snapshotOf(await readDb());
    },
    insertCustomer(input, user, inquiry) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        assertHandle(db, input.instagram_handle);
        const now = new Date().toISOString();
        const customer = toCustomer(input, undefined, user.id, now);
        db.customers.push(customer);
        db.statusHistory.push({
          id: randomUUID(),
          customer_id: customer.id,
          from_stage: null,
          to_stage: customer.stage,
          lost_reason: customer.lost_reason,
          note: null,
          changed_by: user.id,
          changed_at: now,
        });
        if (inquiry) {
          db.inquiries.push({
            ...inquiry,
            id: randomUUID(),
            customer_id: customer.id,
            is_demo: false,
            created_by: user.id,
            created_at: now,
          });
          if (!customer.first_inquiry_date) customer.first_inquiry_date = inquiry.inquiry_date;
        }
        await writeDb(db);
        return customer.id;
      });
    },
    updateCustomer(id, input, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        const existing = db.customers.find((customer) => customer.id === id);
        if (!existing) throw new Error("找不到这个客户");
        assertHandle(db, input.instagram_handle, id);
        const now = new Date().toISOString();
        const next = toCustomer(input, existing, user.id, now);
        if (existing.stage !== next.stage) {
          db.statusHistory.push({
            id: randomUUID(),
            customer_id: id,
            from_stage: existing.stage,
            to_stage: next.stage,
            lost_reason: next.lost_reason,
            note: null,
            changed_by: user.id,
            changed_at: now,
          });
        }
        Object.assign(existing, next);
        await writeDb(db);
      });
    },
    deleteCustomer(id, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        if (db.orders.some((order) => order.customer_id === id)) {
          throw new Error("该客户已有订单，不能删除。可以把阶段改为已流失。");
        }
        db.customers = db.customers.filter((customer) => customer.id !== id);
        db.inquiries = db.inquiries.filter((row) => row.customer_id !== id);
        db.followUps = db.followUps.filter((row) => row.customer_id !== id);
        db.statusHistory = db.statusHistory.filter((row) => row.customer_id !== id);
        await writeDb(db);
      });
    },
    insertInquiry(customerId, input, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        const customer = db.customers.find((row) => row.id === customerId);
        if (!customer) throw new Error("找不到这个客户");
        const now = new Date().toISOString();
        db.inquiries.push({
          ...input,
          id: randomUUID(),
          customer_id: customerId,
          is_demo: customer.is_demo,
          created_by: user.id,
          created_at: now,
        });
        if (!customer.first_inquiry_date) customer.first_inquiry_date = input.inquiry_date;
        await writeDb(db);
      });
    },
    setInquiryValid(id, isValid, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        const inquiry = db.inquiries.find((row) => row.id === id);
        if (!inquiry) throw new Error("找不到这条询盘");
        inquiry.is_valid = isValid;
        await writeDb(db);
      });
    },
    deleteInquiry(id, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        db.inquiries = db.inquiries.filter((row) => row.id !== id);
        await writeDb(db);
      });
    },
    insertFollowUp(customerId, input, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        const customer = db.customers.find((row) => row.id === customerId);
        if (!customer) throw new Error("找不到这个客户");
        const now = new Date().toISOString();
        db.followUps.push({
          ...input,
          id: randomUUID(),
          customer_id: customerId,
          completed: false,
          completed_at: null,
          is_demo: customer.is_demo,
          created_by: user.id,
          created_at: now,
        });
        if (input.latest_intent) customer.latest_intent = input.latest_intent;
        customer.updated_at = now;
        await writeDb(db);
      });
    },
    setFollowUpCompleted(id, completed, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        const row = db.followUps.find((item) => item.id === id);
        if (!row) throw new Error("找不到这条跟进");
        row.completed = completed;
        row.completed_at = completed ? new Date().toISOString() : null;
        await writeDb(db);
      });
    },
    deleteFollowUp(id, user) {
      assertCan(user.role, "customers.write");
      return withLock(async () => {
        const db = await readDb();
        db.followUps = db.followUps.filter((row) => row.id !== id);
        await writeDb(db);
      });
    },
    insertOrder(input, user) {
      assertCan(user.role, "orders.write");
      return withLock(async () => {
        const db = await readDb();
        if (!db.customers.some((customer) => customer.id === input.customer_id)) {
          throw new Error("找不到这个客户");
        }
        const now = new Date().toISOString();
        const seq = db.orderSeq++;
        const ym = input.order_date.slice(0, 7).replace("-", "");
        const order = {
          ...input,
          id: randomUUID(),
          order_number: `DT-${ym}-${String(seq).padStart(4, "0")}`,
          fx_cny_per_usd_e6: db.fxE6,
          is_demo: false,
          created_by: user.id,
          created_at: now,
          updated_at: now,
        };
        db.orders.push(order);
        await writeDb(db);
        return order.id;
      });
    },
    updateOrder(id, input, user, refreshFx) {
      assertCan(user.role, "orders.write");
      return withLock(async () => {
        const db = await readDb();
        const existing = db.orders.find((order) => order.id === id);
        if (!existing) throw new Error("找不到这个订单");
        if (!db.customers.some((customer) => customer.id === input.customer_id)) {
          throw new Error("找不到这个客户");
        }
        Object.assign(existing, input, {
          id: existing.id,
          order_number: existing.order_number,
          fx_cny_per_usd_e6: refreshFx ? db.fxE6 : existing.fx_cny_per_usd_e6,
          is_demo: existing.is_demo,
          created_by: existing.created_by,
          created_at: existing.created_at,
          updated_at: new Date().toISOString(),
        });
        await writeDb(db);
      });
    },
    insertPayment(input, user) {
      assertCan(user.role, "orders.write");
      return withLock(async () => {
        const db = await readDb();
        if (!db.orders.some((order) => order.id === input.order_id)) throw new Error("找不到这个订单");
        db.payments.push({ ...input, id: randomUUID(), created_by: user.id, created_at: new Date().toISOString() });
        await writeDb(db);
      });
    },
    deletePayment(id, user) {
      assertCan(user.role, "orders.write");
      return withLock(async () => {
        const db = await readDb();
        db.payments = db.payments.filter((row) => row.id !== id);
        await writeDb(db);
      });
    },
    insertCostLine(input, user) {
      assertCan(user.role, "orders.write");
      return withLock(async () => {
        const db = await readDb();
        if (!db.orders.some((order) => order.id === input.order_id)) throw new Error("找不到这个订单");
        db.costLines.push({ ...input, id: randomUUID(), created_by: user.id, created_at: new Date().toISOString() });
        await writeDb(db);
      });
    },
    deleteCostLine(id, user) {
      assertCan(user.role, "orders.write");
      return withLock(async () => {
        const db = await readDb();
        db.costLines = db.costLines.filter((row) => row.id !== id);
        await writeDb(db);
      });
    },
    insertAd(input, user) {
      assertCan(user.role, "marketing.write");
      return withLock(async () => {
        const db = await readDb();
        const now = new Date().toISOString();
        db.ads.push({ ...input, id: randomUUID(), is_demo: false, created_by: user.id, created_at: now, updated_at: now });
        await writeDb(db);
      });
    },
    updateAd(id, input, user) {
      assertCan(user.role, "marketing.write");
      return withLock(async () => {
        const db = await readDb();
        const existing = db.ads.find((row) => row.id === id);
        if (!existing) throw new Error("找不到这条广告记录");
        Object.assign(existing, input, { id, is_demo: existing.is_demo, created_by: existing.created_by, created_at: existing.created_at, updated_at: new Date().toISOString() });
        await writeDb(db);
      });
    },
    deleteAd(id, user) {
      assertCan(user.role, "marketing.write");
      return withLock(async () => {
        const db = await readDb();
        db.ads = db.ads.filter((row) => row.id !== id);
        await writeDb(db);
      });
    },
    insertPost(input, user) {
      assertCan(user.role, "marketing.write");
      return withLock(async () => {
        const db = await readDb();
        const now = new Date().toISOString();
        db.posts.push({ ...input, id: randomUUID(), is_demo: false, created_by: user.id, created_at: now, updated_at: now });
        await writeDb(db);
      });
    },
    updatePost(id, input, user) {
      assertCan(user.role, "marketing.write");
      return withLock(async () => {
        const db = await readDb();
        const existing = db.posts.find((row) => row.id === id);
        if (!existing) throw new Error("找不到这条内容");
        Object.assign(existing, input, { id, is_demo: existing.is_demo, created_by: existing.created_by, created_at: existing.created_at, updated_at: new Date().toISOString() });
        await writeDb(db);
      });
    },
    deletePost(id, user) {
      assertCan(user.role, "marketing.write");
      return withLock(async () => {
        const db = await readDb();
        db.posts = db.posts.filter((row) => row.id !== id);
        await writeDb(db);
      });
    },
    saveWeekly(weekStart, answers, user) {
      assertCan(user.role, "reviews.write");
      return withLock(async () => saveReview(await readDb(), "weeklyReviews", "week_start", weekStart, answers, user));
    },
    saveMonthly(monthStart, answers, user) {
      assertCan(user.role, "reviews.write");
      return withLock(async () => saveReview(await readDb(), "monthlyReviews", "month_start", monthStart, answers, user));
    },
    updateSettings(fxE6, targets, user) {
      assertCan(user.role, "settings.read");
      return withLock(async () => {
        const db = await readDb();
        db.fxE6 = fxE6;
        db.targets = targets;
        await writeDb(db);
      });
    },
    updateRole(profileId, role, user) {
      assertCan(user.role, "team.write");
      return withLock(async () => {
        const db = await readDb();
        assertRoleChange(db.profiles, profileId, role);
        const profile = db.profiles.find((row) => row.id === profileId);
        if (!profile) throw new Error("找不到这个成员");
        profile.role = role;
        profile.updated_at = new Date().toISOString();
        await writeDb(db);
      });
    },
    loadDemo(user) {
      assertCan(user.role, "settings.read");
      return withLock(async () => {
        const db = await readDb();
        stripDemo(db);
        const demo = buildDemoRecords(shanghaiToday());
        db.customers.push(...demo.customers);
        db.inquiries.push(...demo.inquiries);
        db.followUps.push(...demo.followUps);
        db.orders.push(...demo.orders);
        db.payments.push(...demo.payments);
        db.statusHistory.push(...demo.history);
        db.ads.push(...demo.ads);
        db.posts.push(...demo.posts);
        await writeDb(db);
      });
    },
    clearDemo(user) {
      assertCan(user.role, "settings.read");
      return withLock(async () => {
        const db = await readDb();
        const demoCustomerIds = new Set(db.customers.filter((customer) => customer.is_demo).map((customer) => customer.id));
        if (db.orders.some((order) => !order.is_demo && demoCustomerIds.has(order.customer_id))) {
          throw new Error("Demo 客户下还有未标记 Demo 的订单，先处理订单再清除");
        }
        stripDemo(db);
        await writeDb(db);
      });
    },
  };
}

function stripDemo(db: LocalFile) {
  const demoOrderIds = new Set(db.orders.filter((order) => order.is_demo).map((order) => order.id));
  db.payments = db.payments.filter((row) => !demoOrderIds.has(row.order_id));
  db.costLines = db.costLines.filter((row) => !demoOrderIds.has(row.order_id));
  db.orders = db.orders.filter((row) => !row.is_demo);
  const demoCustomerIds = new Set(db.customers.filter((customer) => customer.is_demo).map((customer) => customer.id));
  db.customers = db.customers.filter((row) => !row.is_demo);
  db.inquiries = db.inquiries.filter((row) => !demoCustomerIds.has(row.customer_id) && !row.is_demo);
  db.followUps = db.followUps.filter((row) => !demoCustomerIds.has(row.customer_id) && !row.is_demo);
  db.statusHistory = db.statusHistory.filter((row) => !demoCustomerIds.has(row.customer_id));
  db.ads = db.ads.filter((row) => !row.is_demo);
  db.posts = db.posts.filter((row) => !row.is_demo);
}

async function saveReview(
  db: LocalFile,
  key: "weeklyReviews" | "monthlyReviews",
  field: "week_start" | "month_start",
  when: string,
  answers: WeeklyAnswers | MonthlyAnswers,
  user: SessionUser,
) {
  const now = new Date().toISOString();
  const list = db[key] as ({ id: string; updated_by: string | null; updated_at: string } & Record<string, unknown>)[];
  const existing = list.find((row) => row[field] === when);
  if (existing) {
    existing.answers = answers;
    existing.updated_by = user.id;
    existing.updated_at = now;
  } else {
    list.push({ id: randomUUID(), [field]: when, answers, updated_by: user.id, updated_at: now });
  }
  await writeDb(db);
}

export type { Role, AdInput, PostInput, CostLineInput, PaymentInput, OrderInput, FollowUpInput, InquiryInput };
