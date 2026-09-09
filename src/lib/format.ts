const timeFmt = new Intl.DateTimeFormat("ar-SA", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("ar-SA", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatTime = (ts: number) => timeFmt.format(new Date(ts));
export const formatDateTime = (ts: number) => dateFmt.format(new Date(ts));

export function relative(ts: number, now = Date.now()) {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "الآن";
  if (min < 60) return `قبل ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  return `قبل ${day} يوم`;
}

export function countdown(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}س ${m % 60}د`;
  if (m > 0) return `${m}د ${s % 60}ث`;
  return `${s}ث`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}
