"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatUsdCents } from "@/lib/money";

const axis = { fontSize: 11, fill: "currentColor" };

export function TrendChart({
  data,
  showPaid = true,
}: {
  data: { date: string; inquiries: number; paidOrders: number }[];
  showPaid?: boolean;
}) {
  return (
    <div className="h-64 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={axis} tickFormatter={(value) => String(value).slice(5)} />
          <YAxis allowDecimals={false} tick={axis} width={28} />
          <Tooltip />
          <Bar dataKey="inquiries" name="新增询盘" fill="var(--chart-1)" radius={3} />
          {showPaid ? <Bar dataKey="paidOrders" name="有效付费订单" fill="var(--chart-2)" radius={3} /> : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpendChart({ data }: { data: { date: string; spend: number }[] }) {
  return (
    <div className="h-56 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={axis} tickFormatter={(value) => String(value).slice(5)} />
          <YAxis tick={axis} width={48} tickFormatter={(value) => formatUsdCents(Number(value))} />
          <Tooltip formatter={(value) => formatUsdCents(Number(value))} />
          <Bar dataKey="spend" name="广告花费" fill="var(--chart-4)" radius={3} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBar({ data }: { data: { label: string; count: number }[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">这个区间还没有可画的分布。</p>;
  return (
    <div className="h-56 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={axis} />
          <YAxis type="category" dataKey="label" tick={axis} width={88} />
          <Tooltip />
          <Bar dataKey="count" name="数量" fill="var(--chart-1)" radius={3} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
