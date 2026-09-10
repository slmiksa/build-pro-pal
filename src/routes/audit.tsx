import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Ban,
  Download,
  Eye,
  FileText,
  LogIn,
  ScanEye,
  Forward,
  ShieldAlert,
  Timer,
  Users2,
  UserPlus,
  Paperclip,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatDateTime, initials } from "@/lib/format";
import type { AuditEvent, AuditType } from "@/lib/types";
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
  message_forwarded: { label: "إعادة توجيه رسالة", icon: Forward, tone: "info" },
  group_created: { label: "إنشاء مجموعة", icon: Users2, tone: "info" },
};

const filters: { key: "all" | AuditType; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "file_open", label: "فتح الملفات" },
  { key: "download_blocked", label: "تحميل مرفوض" },
  { key: "message_forwarded", label: "إعادة توجيه" },
  { key: "screenshot_attempt", label: "محاولات الالتقاط" },
  { key: "message_revoked", label: "سحب الرسائل" },
];

const toneText = (tone: "danger" | "warn" | "info") =>
  tone === "danger"
    ? "text-destructive"
    : tone === "warn"
      ? "text-warning"
      : "text-primary";

const toneBg = (tone: "danger" | "warn" | "info") =>
  tone === "danger"
    ? "bg-destructive/12 text-destructive"
    : tone === "warn"
      ? "bg-warning/12 text-warning"
      : "bg-primary/12 text-primary";

function AuditPage() {
  const {
    audit,
    messages,
    currentUserId,
    userById,
    isAdmin,
    users,
    conversations,
    conversationTitle,
  } = useApp();
  const [tab, setTab] = useState<"mine" | "files" | "all">("files");
  const [filter, setFilter] = useState<"all" | AuditType>("all");
  const [member, setMember] = useState<"all" | string>("all");

  /* Events caused by me */
  const myActivity = useMemo(
    () => audit.filter((e) => e.actorId === currentUserId),
    [audit, currentUserId],
  );

  /* Admin view: every event, optionally scoped to one member */
  const allRows = useMemo(() => {
    let list = audit;
    if (member !== "all") list = list.filter((e) => e.actorId === member);
    if (filter !== "all") list = list.filter((e) => e.type === filter);
    return list;
  }, [audit, member, filter]);

  const describe = (e: AuditEvent) => {
    const msg = e.messageId ? messages.find((m) => m.id === e.messageId) : undefined;
    const conv = (e.conversationId ?? msg?.conversationId)
      ? conversations.find((c) => c.id === (e.conversationId ?? msg?.conversationId))
      : undefined;
    return {
      file: msg?.attachment?.name ?? "",
      where: conv ? conversationTitle(conv) : "",
      owner: msg ? (userById(msg.senderId)?.name ?? "") : "",
    };
  };


  /* My own files (messages with attachments that I sent) + every event on them */
  const myFiles = useMemo(() => {
    const mine = messages.filter(
      (m) => m.senderId === currentUserId && m.attachment,
    );
    const byMessage = new Map<string, AuditEvent[]>();
    for (const e of audit) {
      if (!e.messageId) continue;
      const arr = byMessage.get(e.messageId);
      if (arr) arr.push(e);
      else byMessage.set(e.messageId, [e]);
    }
    return mine
      .map((m) => {
        const events = (byMessage.get(m.id) ?? []).sort((a, b) => b.at - a.at);
        return {
          message: m,
          events,
          opens: events.filter((e) => e.type === "file_open").length,
          blocked: events.filter(
            (e) => e.type === "download_blocked" || e.type === "copy_blocked",
          ).length,
          shots: events.filter((e) => e.type === "screenshot_attempt").length,
          viewers: new Set(
            events.filter((e) => e.type === "file_open").map((e) => e.actorId),
          ).size,
          last: events[0]?.at ?? m.createdAt,
        };
      })
      .sort((a, b) => b.last - a.last);
  }, [messages, audit, currentUserId]);

  const rows = useMemo(
    () =>
      filter === "all"
        ? myActivity
        : myActivity.filter((e) => e.type === filter),
    [myActivity, filter],
  );

  const stats = useMemo(() => {
    const all = myFiles.flatMap((f) => f.events);
    return [
      { label: "ملفاتي المُرسلة", value: myFiles.length, tone: "info" as const },
      {
        label: "مرات فتح ملفاتي",
        value: all.filter((e) => e.type === "file_open").length,
        tone: "info" as const,
      },
      {
        label: "محاولات تحميل/نسخ مرفوضة",
        value: all.filter(
          (e) => e.type === "download_blocked" || e.type === "copy_blocked",
        ).length,
        tone: "warn" as const,
      },
      {
        label: "محاولات التقاط الشاشة",
        value: all.filter((e) => e.type === "screenshot_attempt").length,
        tone: "danger" as const,
      },
    ];
  }, [myFiles]);

  return (
    <AppShell title="السجل" subtitle="كل محاولة تُنسب لصاحبها">
      <div className="mx-auto max-w-4xl space-y-3.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <div className={cn("text-xl leading-none font-bold", toneText(s.tone))}>
                {s.value}
              </div>
              <div className="mt-1.5 text-[11px] leading-4 font-medium text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {(
            [
              { key: "files", label: "ملفاتي ومن فتحها" },
              { key: "mine", label: "نشاطي" },
              ...(isAdmin ? [{ key: "all", label: "سجل كل الأعضاء" }] : []),
            ] as { key: "files" | "mine" | "all"; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[12.5px] font-semibold transition-colors",
                tab === t.key
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "all" && isAdmin ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={member}
                onChange={(e) => setMember(e.target.value)}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-[12.5px] font-medium"
              >
                <option value="all">كل العضويات</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </select>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | AuditType)}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-[12.5px] font-medium"
              >
                <option value="all">كل الأحداث</option>
                {(Object.keys(meta) as AuditType[]).map((k) => (
                  <option key={k} value={k}>
                    {meta[k].label}
                  </option>
                ))}
              </select>
              <span className="text-[11.5px] text-muted-foreground">
                {allRows.length} حدث
              </span>
            </div>

            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {allRows.map((e) => {
                const m = meta[e.type];
                const actor = userById(e.actorId);
                const d = describe(e);
                return (
                  <li key={e.id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full",
                        toneBg(m.tone),
                      )}
                    >
                      <m.icon className="size-4" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">
                        {m.label} — {actor?.name ?? "مستخدم"}
                      </div>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {[
                          d.file && `الملف: ${d.file}`,
                          d.where && `في: ${d.where}`,
                          d.owner && `صاحب الملف: ${d.owner}`,
                          e.detail,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <time className="shrink-0 text-[10.5px] text-muted-foreground">
                      {formatDateTime(e.at)}
                    </time>
                  </li>
                );
              })}
              {allRows.length === 0 && (
                <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  لا توجد أحداث بهذا التصنيف.
                </li>
              )}
            </ul>
          </div>
        ) : tab === "files" ? (
          <div className="space-y-2">
            {myFiles.length === 0 && (
              <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-[13px] text-muted-foreground">
                لم ترسل أي ملف بعد. سجل الفتح والمحاولات يظهر هنا لكل ملف ترسله.
              </p>
            )}
            {myFiles.map((f) => (
              <details
                key={f.message.id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                    <Paperclip className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">
                      {f.message.attachment?.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {formatDateTime(f.message.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold">
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-primary">
                      {f.opens} فتح · {f.viewers} شخص
                    </span>
                    {f.blocked > 0 && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">
                        {f.blocked} منع
                      </span>
                    )}
                    {f.shots > 0 && (
                      <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-destructive">
                        {f.shots} التقاط
                      </span>
                    )}
                  </span>
                </summary>
                <ul className="divide-y divide-border border-t border-border">
                  {f.events.length === 0 && (
                    <li className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                      لم يفتح أحد هذا الملف بعد.
                    </li>
                  )}
                  {f.events.map((e) => {
                    const m = meta[e.type];
                    const actor = userById(e.actorId);
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-2.5 px-3 py-2"
                      >
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full",
                            toneBg(m.tone),
                          )}
                        >
                          <m.icon className="size-3.5" strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold">
                            {m.label} — {actor?.name ?? "مستخدم"}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {e.detail}
                          </span>
                        </span>
                        <time className="shrink-0 text-[10.5px] text-muted-foreground">
                          {formatDateTime(e.at)}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filters.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? "default" : "outline"}
                  className="h-7 shrink-0 rounded-full px-3 text-[12px] font-semibold shadow-none"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {rows.map((e) => {
                const m = meta[e.type];
                const actor = userById(e.actorId);
                return (
                  <li key={e.id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full",
                        toneBg(m.tone),
                      )}
                    >
                      <m.icon className="size-4" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">
                        {m.label}
                      </div>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {e.detail}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-[10.5px] text-muted-foreground">
                      <span
                        className="grid size-5 place-items-center rounded-full text-[8px] font-bold text-primary-foreground"
                        style={{ backgroundColor: actor?.color }}
                        title={actor?.name}
                      >
                        {initials(actor?.name ?? "؟")}
                      </span>
                      <time>{formatDateTime(e.at)}</time>
                    </div>
                  </li>
                );
              })}
              {rows.length === 0 && (
                <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  لا توجد أحداث بهذا التصنيف.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </AppShell>
  );
}
