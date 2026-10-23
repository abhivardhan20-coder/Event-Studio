export function uid() {
  return crypto.randomUUID();
}
export function money(value: number) {
  return currencyFormatter.format(value);
}
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
export const PLANNER_TIME_ZONE = "Asia/Kolkata";
const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PLANNER_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function dateLabel(value: string, short = false) {
  return new Date(value + "T12:00:00Z").toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
  });
}
export function todayISO(now = new Date()) {
  const parts = calendarFormatter.formatToParts(now);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}
export function daysUntil(date: string, today = todayISO()) {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86400000,
  );
}
export function relativeDate(date: string) {
  const days = daysUntil(date);
  return days === 0
    ? "Today"
    : days === 1
      ? "Tomorrow"
      : days === -1
        ? "Yesterday"
        : days < 0
          ? `${Math.abs(days)} days overdue`
          : dateLabel(date, true);
}
export function dateOffset(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
