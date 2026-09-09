import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Ban,
  Download,
  Eye,
  FileText,
  LogIn,
  ScanEye,
  ShieldAlert,
  Timer,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatDateTime, initials } from "@/lib/format";
import type { AuditType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "سجل التدقيق · درع" },
      {
        name: "description",
        content:
          "سجل كامل لكل فتح ملف، ومحاولة التقاط شاشة، وتحميل مرفوض، ورسالة مسحوبة داخل منصة الشركة.",
      },
      { property: "og:title", content: "سجل التدقيق · درع" },
      {
        property: "og:description",
        content: "من فتح ماذا ومتى — مسؤولية قابلة للتتبع.",
      },
    ],
  }),
  component: AuditPage,
});

const meta: Record<
  AuditType,
  { label: string; icon: typeof Eye; tone: "danger" | "warn" | "info" }
> = {
  screenshot_attempt: { label: "محاولة التقاط شاشة", icon: ScanEye, tone: "danger" },
  download_blocked: { label: "تحميل مرفوض", icon: Download, tone: "warn" },
  copy_blocked: { label: "نسخ مرفوض", icon: Ban, tone: "warn" },
  file_open: { label: "فتح ملف", icon: FileText, tone: "info" },
  message_revoked: { label: "سحب رسالة", icon: Ban, tone: "warn" },
  message_expired: { label: "انتهاء رسالة", icon: Timer, tone: "info" },
  login: { label: "تسجيل دخول", icon: LogIn, tone: "info" },
  invite_created: { label: "إنشاء دعوة", icon: UserPlus, tone: "info" },
  member_added: { label: "إضافة عضو", icon: UserPlus, tone: "info" },
  member_disabled: { label: "تغيير حالة عضو", icon: ShieldAlert, tone: "warn" },
};

const filters: { key: "all" | AuditType; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "screenshot_attempt", label: "محاولات الالتقاط" },
  { key: "file_open", label: "فتح الملفات" },
  { key: "download_blocked", label: "تحميل مرفوض" },
  { key: "message_revoked", label: "سحب الرسائل" },
];

function AuditPage() {
  const { audit, userById } = useApp();
  const [filter, setFilter] = useState<"all" | AuditType>("all");

  const rows = useMemo(
    () => (filter === "all" ? audit : audit.filter((e) => e.type === filter)),
    [audit, filter],
  );

  const stats = useMemo(
    () => [
      {
        label: "محاولات التقاط الشاشة",
        value: audit.filter((e) => e.type === "screenshot_attempt").length,
        tone: "danger" as const,
      },
      {
        label: "تحميلات مرفوضة",
        value: audit.filter((e) => e.type === "download_blocked").length,
        tone: "warn" as const,
      },
      {
        label: "مرات فتح الملفات",
        value: audit.filter((e) => e.type === "file_open").length,
        tone: "info" as const,
      },
      {
        label: "رسائل مسحوبة",
        value: audit.filter((e) => e.type === "message_revoked").length,
        tone: "warn" as const,
      },
    ],
    [audit],
  );

  return (
    <AppShell title="سجل التدقيق" subtitle="كل محاولة تُنسب لصاحبها">
      <div className="mx-auto max-w-4xl space-y-5">
        <p className="text-[13px] font-medium leading-6 text-foreground/75">
          كل عملية على محتوى محمي تُسجَّل باسم صاحبها ووقتها.
        </p>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="min-h-28 rounded-2xl border border-border bg-surface p-3.5 shadow-sm"
            >
              <div
                className={cn(
                  "text-[27px] font-bold leading-none",
                  s.tone === "danger" && "text-destructive",
                  s.tone === "warn" && "text-warning",
                  s.tone === "info" && "text-primary",
                )}
              >
                {s.value}
              </div>
              <div className="mt-3 text-xs font-semibold leading-5 text-foreground/80">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              className="shrink-0 rounded-full px-4 font-semibold shadow-none"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {rows.map((e) => {
            const m = meta[e.type];
            const actor = userById(e.actorId);
            return (
              <li key={e.id} className="flex items-start gap-3.5 px-4 py-4">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    m.tone === "danger" && "bg-destructive/15 text-destructive",
                    m.tone === "warn" && "bg-warning/15 text-warning",
                    m.tone === "info" && "bg-primary/15 text-primary",
                  )}
                >
                  <m.icon className="size-[18px]" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground">
                    {m.label}
                  </div>
                  <p className="mt-1 text-xs font-medium leading-5 text-foreground/70">
                    {e.detail}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                    <span
                      className="flex size-5 items-center justify-center rounded-full text-[8px] font-bold text-primary-foreground"
                      style={{ backgroundColor: actor?.color }}
                      title={actor?.name}
                    >
                      {initials(actor?.name ?? "؟")}
                    </span>
                    <span>{actor?.name ?? "مستخدم"}</span>
                    <span aria-hidden="true">•</span>
                    <time>{formatDateTime(e.at)}</time>
                  </div>
                </div>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              لا توجد أحداث بهذا التصنيف.
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
