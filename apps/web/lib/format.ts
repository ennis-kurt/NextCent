const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const preciseCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0
});

const wholeNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatCurrencyPrecise(value: number) {
  return preciseCurrencyFormatter.format(value);
}

export function formatPercent(value: number) {
  return percentFormatter.format(value);
}

export function formatNumber(value: number) {
  return wholeNumberFormatter.format(value);
}

export function formatDate(value: string | null) {
  if (!value) return "Not projected";
  return monthDayFormatter.format(new Date(value));
}

export function formatMonthYear(value: string | null) {
  if (!value) return "Unavailable";
  return monthYearFormatter.format(new Date(value));
}

export function formatDateTime(value: string) {
  return shortDateTimeFormatter.format(new Date(value));
}

export function titleCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
