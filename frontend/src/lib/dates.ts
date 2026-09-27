export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, amount: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShort(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function daysUntil(target: string | null, from: string) {
  if (!target) return null;
  const [ty, tm, td] = target.split("-").map(Number);
  const [fy, fm, fd] = from.split("-").map(Number);
  const targetDate = new Date(ty, tm - 1, td).getTime();
  const fromDate = new Date(fy, fm - 1, fd).getTime();
  return Math.round((targetDate - fromDate) / 86400000);
}

export function visitPhrase(next: string | null, today: string) {
  const days = daysUntil(next, today);
  if (days === null) return "No next visit date yet";
  if (days === 0) return "Next visit is today";
  if (days === 1) return "Next visit is tomorrow";
  if (days > 1) return `Next visit in ${days} days`;
  return "Next visit date has passed";
}
