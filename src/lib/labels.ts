import type {
  ContentType,
  CostCategory,
  CustomerStage,
  LostReason,
  OrderStatus,
  PaymentKind,
  Platform,
  ProductCode,
  Role,
} from "@/lib/types";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "创始人",
  cs: "客服",
  content: "内容",
};

export const STAGE_LABEL: Record<CustomerStage, string> = {
  new_inquiry: "新询盘",
  valid_inquiry: "有效询盘",
  quoted: "已报价",
  considering: "考虑中",
  pending_payment: "待付款",
  paid: "已付款",
  lost: "已流失",
};

export const LOST_REASON_LABEL: Record<LostReason, string> = {
  price_high: "价格太高",
  lead_time: "制作周期太长",
  shipping: "运费",
  trust: "不信任",
  no_budget: "暂无预算",
  curious: "只是好奇",
  competitor: "选其他商家",
  no_reply: "未回复",
  other: "其他",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  ig: "Instagram",
  fb: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  other: "其他",
};

export const PRODUCT_LABEL: Record<ProductCode, string> = {
  "2d_charm": "2D 挂件",
  "3d_charm": "3D 挂件",
  figurine: "摆件",
  frame: "相框",
  scarf_hat: "围巾帽",
  other: "其他",
};

export const PRODUCT_HINT: Record<ProductCode, string> = {
  "2d_charm": "参考价 $129",
  "3d_charm": "参考价 $179",
  figurine: "按尺寸报价",
  frame: "按尺寸与数量报价",
  scarf_hat: "未来产品，尚未作为标准价",
  other: "自定义",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: "已确认",
  in_production: "制作中",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
  refunded: "已退款",
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  deposit: "定金",
  balance: "尾款",
  full: "全款",
  refund: "退款",
  other: "其他收款",
};

export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  production: "制作",
  shipping: "物流",
  payment_fee: "支付手续费",
  other: "其他可变成本",
  attributed_ad: "归因广告成本",
};

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  process: "制作过程",
  finished: "成品展示",
  memorial: "纪念故事",
  review: "客户评价",
  intro: "产品介绍",
  other: "其他",
};

export const PRESET_LABEL: Record<string, string> = {
  today: "今天",
  yesterday: "昨天",
  "7d": "近 7 天",
  week: "本周",
  month: "本月",
  last_month: "上月",
  custom: "自定义",
};

export const WEEKLY_QUESTIONS: { key: "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7"; label: string }[] = [
  { key: "q1", label: "本周最有效的询盘来自哪里？证据是什么？" },
  { key: "q2", label: "哪些跟进没有推进？卡在报价、信任、价格还是失联？" },
  { key: "q3", label: "报价之后仍未付款的客户，主要反对意见是哪一句原话？" },
  { key: "q4", label: "广告花费是否带来了有效询盘？哪条素材该加码，哪条该停？" },
  { key: "q5", label: "在制订单有没有延期、返工或成本超支？" },
  { key: "q6", label: "本周有没有不该追的询盘？下次如何更早判断？" },
  { key: "q7", label: "如果下周只能改一件事，改什么？怎么知道它生效了？" },
];
