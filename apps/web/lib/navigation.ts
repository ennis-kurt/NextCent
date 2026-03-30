export type AppNavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  mobilePrimary: boolean;
  mobileOrder: number;
};

export const APP_NAV: readonly AppNavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", mobileLabel: "Dashboard", mobilePrimary: true, mobileOrder: 1 },
  { href: "/app/cash-flow", label: "Cash Flow", mobileLabel: "Cash", mobilePrimary: true, mobileOrder: 2 },
  { href: "/app/debt-optimizer", label: "Debt Optimizer", mobileLabel: "Debt", mobilePrimary: true, mobileOrder: 3 },
  { href: "/app/investment", label: "Investment", mobileLabel: "Invest", mobilePrimary: false, mobileOrder: 4 },
  { href: "/app/credit-health", label: "Credit Health", mobileLabel: "Credit", mobilePrimary: false, mobileOrder: 5 },
  { href: "/app/subscriptions", label: "Subscriptions", mobileLabel: "Subs", mobilePrimary: false, mobileOrder: 6 },
  { href: "/app/simulation", label: "Simulation", mobileLabel: "Sim", mobilePrimary: true, mobileOrder: 4 },
  { href: "/app/monthly-review", label: "Monthly Review", mobileLabel: "Review", mobilePrimary: false, mobileOrder: 7 },
  { href: "/app/chat", label: "AI Accountant", mobileLabel: "AI", mobilePrimary: false, mobileOrder: 8 },
  { href: "/app/privacy", label: "Privacy", mobileLabel: "Privacy", mobilePrimary: false, mobileOrder: 9 }
] as const;
