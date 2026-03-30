"use client";

import type { CategorySpend } from "@contracts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency, formatMonthYear } from "@/lib/format";

const COLORS = ["#1f7468", "#c3954f", "#28495c", "#5d766f", "#8f5c43", "#496b7b"];

function formatMonthTick(value: string) {
  const [year, month] = value.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value;
  }
  return monthNames[monthIndex];
}

export function SpendBreakdownChart({ data }: { data: CategorySpend[] }) {
  return (
    <div className="w-full overflow-x-auto pb-2" role="img" aria-label="Bar chart showing spending totals by category.">
      <div className="h-64 min-w-[420px] w-full sm:h-72 sm:min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={30}>
            <CartesianGrid stroke="rgba(15, 23, 32, 0.08)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#5b6470", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#5b6470", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid rgba(18, 32, 43, 0.12)",
                background: "#fffdf8",
                boxShadow: "0 20px 40px rgba(10, 16, 24, 0.12)"
              }}
              cursor={{ fill: "rgba(31, 116, 104, 0.06)" }}
              formatter={(value: number) => formatCurrency(Number(value))}
              itemStyle={{ color: "#12202b" }}
              labelStyle={{ color: "#12202b", fontWeight: 600 }}
            />
            <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.category_key} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CashFlowTrendChart({
  data
}: {
  data: Array<{ month: string; income: number; spending: number; net: number }>;
}) {
  return (
    <div className="w-full overflow-x-auto pb-2" role="img" aria-label="Area chart comparing monthly income and spending trends.">
      <div className="h-64 min-w-[420px] w-full sm:h-72 sm:min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#1f7468" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#1f7468" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#c3954f" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#c3954f" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(15, 23, 32, 0.08)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#5b6470", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#5b6470", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid rgba(18, 32, 43, 0.12)",
                background: "#fffdf8",
                boxShadow: "0 20px 40px rgba(10, 16, 24, 0.12)"
              }}
              formatter={(value: number) => formatCurrency(Number(value))}
              itemStyle={{ color: "#12202b" }}
              labelStyle={{ color: "#12202b", fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="income" stroke="#1f7468" fill="url(#incomeFill)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="spending" stroke="#c3954f" fill="url(#spendFill)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BalanceHistoryChart({
  data,
  ariaLabel,
  color = "#1f7468"
}: {
  data: Array<{ as_of: string; balance: number }>;
  ariaLabel: string;
  color?: string;
}) {
  return (
    <div className="w-full overflow-x-auto pb-2" role="img" aria-label={ariaLabel}>
      <div className="h-64 min-w-[420px] w-full sm:h-72 sm:min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`balanceFill-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(15, 23, 32, 0.08)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="as_of" tick={{ fill: "#5b6470", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatMonthTick} />
            <YAxis
              tick={{ fill: "#5b6470", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid rgba(18, 32, 43, 0.12)",
                background: "#fffdf8",
                boxShadow: "0 20px 40px rgba(10, 16, 24, 0.12)"
              }}
              formatter={(value: number) => formatCurrency(Number(value))}
              itemStyle={{ color: "#12202b" }}
              labelFormatter={(value) => formatMonthYear(String(value))}
              labelStyle={{ color: "#12202b", fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="balance" stroke={color} fill={`url(#balanceFill-${color.replace("#", "")})`} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MiniBalanceTrendChart({
  data,
  color = "#1f7468"
}: {
  data: Array<{ as_of: string; balance: number }>;
  color?: string;
}) {
  return (
    <div className="h-20 w-full" role="img" aria-label="Compact 12-month balance trend.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="balance"
            stroke={color}
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: "#fffdf8", strokeWidth: 1.5 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid rgba(18, 32, 43, 0.12)",
              background: "#fffdf8",
              boxShadow: "0 16px 30px rgba(10, 16, 24, 0.12)"
            }}
            formatter={(value: number) => formatCurrency(Number(value))}
            itemStyle={{ color: "#12202b" }}
            labelFormatter={(value) => formatMonthYear(String(value))}
            labelStyle={{ color: "#12202b", fontWeight: 600 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
