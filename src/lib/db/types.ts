import type {
  AdInput,
  CostLineInput,
  CustomerInput,
  FollowUpInput,
  InquiryInput,
  MonthlyAnswers,
  OrderInput,
  PaymentInput,
  PostInput,
  Role,
  SessionUser,
  Snapshot,
  WeeklyAnswers,
} from "@/lib/types";

export type Database = {
  mode: "local" | "supabase";
  loadSnapshot(): Promise<Snapshot>;
  insertCustomer(input: CustomerInput, user: SessionUser, inquiry: InquiryInput | null): Promise<string>;
  updateCustomer(id: string, input: CustomerInput, user: SessionUser): Promise<void>;
  deleteCustomer(id: string, user: SessionUser): Promise<void>;
  insertInquiry(customerId: string, input: InquiryInput, user: SessionUser): Promise<void>;
  setInquiryValid(id: string, isValid: boolean, user: SessionUser): Promise<void>;
  deleteInquiry(id: string, user: SessionUser): Promise<void>;
  insertFollowUp(customerId: string, input: FollowUpInput, user: SessionUser): Promise<void>;
  setFollowUpCompleted(id: string, completed: boolean, user: SessionUser): Promise<void>;
  deleteFollowUp(id: string, user: SessionUser): Promise<void>;
  insertOrder(input: OrderInput, user: SessionUser): Promise<string>;
  updateOrder(id: string, input: OrderInput, user: SessionUser, refreshFx: boolean): Promise<void>;
  insertPayment(input: PaymentInput, user: SessionUser): Promise<void>;
  deletePayment(id: string, user: SessionUser): Promise<void>;
  insertCostLine(input: CostLineInput, user: SessionUser): Promise<void>;
  deleteCostLine(id: string, user: SessionUser): Promise<void>;
  insertAd(input: AdInput, user: SessionUser): Promise<void>;
  updateAd(id: string, input: AdInput, user: SessionUser): Promise<void>;
  deleteAd(id: string, user: SessionUser): Promise<void>;
  insertPost(input: PostInput, user: SessionUser): Promise<void>;
  updatePost(id: string, input: PostInput, user: SessionUser): Promise<void>;
  deletePost(id: string, user: SessionUser): Promise<void>;
  saveWeekly(weekStart: string, answers: WeeklyAnswers, user: SessionUser): Promise<void>;
  saveMonthly(monthStart: string, answers: MonthlyAnswers, user: SessionUser): Promise<void>;
  updateSettings(fxE6: number, targets: Record<string, number>, user: SessionUser): Promise<void>;
  updateRole(profileId: string, role: Role, user: SessionUser): Promise<void>;
  loadDemo(user: SessionUser): Promise<void>;
  clearDemo(user: SessionUser): Promise<void>;
};
