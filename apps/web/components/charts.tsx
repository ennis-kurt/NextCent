"use client";

import type { CategorySpend } from "@contracts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency } from "@/lib/format";

const COLORS = ["#1f7468", "#b78b42", "#264653", "#5b6470", "#9c6644", "#3c6e71"];

export function SpendBreakdownChart({ data }: { data: CategorySpend[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Bar chart showing spending totals by category.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(15, 23, 32, 0.08)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#5b6470", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#5b6470", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <Tooltip cursor={{ fill: "rgba(31, 116, 104, 0.08)" }} formatter={(value: number) => formatCurrency(Number(value))} />
          <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.category_key} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashFlowTrendChart({
  data
}: {
  data: Array<{ month: string; income: number; spending: number; net: number }>;
}) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Area chart comparing monthly income and spending trends.">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#1f7468" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1f7468" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#b78b42" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#b78b42" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(15, 23, 32, 0.08)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#5b6470", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#5b6470", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
          <Area type="monotone" dataKey="income" stroke="#1f7468" fill="url(#incomeFill)" strokeWidth={2.2} />
          <Area type="monotone" dataKey="spending" stroke="#b78b42" fill="url(#spendFill)" strokeWidth={2.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
