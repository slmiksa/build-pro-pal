import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, EyeOff, Search, ShieldCheck, Users2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/Composer";
import { MessageItem } from "@/components/MessageItem";
import { ProtectedViewer } from "@/components/ProtectedViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScreenGuard } from "@/hooks/use-screen-guard";
import { COMPANY_NAME } from "@/data/seed";
import { formatTime, initials, relative } from "@/lib/format";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isExpired, useApp } from "@/store/app";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "المحادثات المحمية · درع" },
      {
        name: "description",
        content:
          "محادثات فردية ومجموعات مع صلاحيات حماية لكل رسالة: منع التحميل والنسخ، علامة مائية، واختفاء تلقائي.",
      },
      { property: "og:title", content: "المحادثات المحمية · درع" },
      {
        property: "og:description",
        content: "رسائل وملفات داخلية بصلاحيات يحددها المرسل.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const {
    conversations,
    messages,
    users,
    currentUserId,
    conversationTitle,
    userById,
    markRead,
    registerOpen,
    startDirect,
    log,
  } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Message | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => messages.filter((m) => !isExpired(m)),
    [messages],
  );

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const thread = visible.filter((m) => m.conversationId === activeId);
  const threadProtected = thread.some((m) => m.policy.blockScreenshot);

  const { masked, reveal } = useScreenGuard({
    enabled: threadProtected,
    onAttempt: (reason) => {
      log("screenshot_attempt", `${reason} أثناء عرض محادثة محمية`, {
        actorId: currentUserId ?? undefined,
        conversationId: activeId ?? undefined,
      });
      toast.warning("تم تعتيم المحادثة", {
        description: "سُجلت المحاولة وأُبلغ المرسل.",
      });
    },
  });

  useEffect(() => {
    if (activeId) markRead(activeId);
  }, [activeId, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, activeId]);

  // Keep the newest message visible when the on-screen keyboard opens/closes.
  useEffect(() => {
    if (!activeId) return;
    const toEnd = () => {
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }),
      );
      window.setTimeout(
        () => endRef.current?.scrollIntoView({ block: "end" }),
        280,
      );
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", toEnd);
    document.addEventListener("focusin", toEnd);
    return () => {
      vv?.removeEventListener("resize", toEnd);
      document.removeEventListener("focusin", toEnd);
    };
  }, [activeId]);


  const list = conversations.filter((c) =>
    conversationTitle(c).includes(query.trim()),
  );

  const openAttachment = async (m: Message) => {
    if ((await registerOpen(m.id)) === "limit") {
      toast.error("انتهى عدد مرات الفتح المسموحة لهذا الملف");
      return;
    }
    setViewing(m);
  };

  const beginChat = async (userId: string) => {
    const id = await startDirect(userId);
    if (!id) {
      toast.error("تعذّر بدء المحادثة");
      return;
    }
    setActiveId(id);
  };

  /* ---------- Conversation list ---------- */
  if (!active) {
    return (
      <AppShell
        title="المحادثات"
        subtitle={`${COMPANY_NAME} · تواصل داخلي محمي`}
        padded={false}
      >
        <div className="shrink-0 px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث آمن…"
              className="h-12 rounded-2xl border-transparent bg-surface-2 pe-11 text-sm shadow-none focus-visible:border-primary/30"
            />
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {list.length === 0 && (
            <p className="pt-12 text-center text-sm text-muted-foreground">
              {query.trim() ? "لا توجد محادثة بهذا الاسم." : "لا توجد محادثات بعد."}
            </p>
          )}
          {!query.trim() && list.length === 0 && (
            <div className="pt-4">
              <p className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground">
                ابدأ محادثة مع زميل
              </p>
              <div className="space-y-1">
                {users
                  .filter((u) => u.id !== currentUserId && !u.disabled)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => void beginChat(u.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors active:bg-surface-2/60"
                    >
                      <span
                        className="flex size-9 items-center justify-center rounded-xl text-[11px] font-bold text-primary-foreground"
                        style={{ backgroundColor: u.color }}
                      >
                        {initials(u.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {u.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {u.title}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {list.map((c) => {
            const last = visible
              .filter((m) => m.conversationId === c.id)
              .slice(-1)[0];
            const other = userById(
              c.memberIds.find((id) => id !== currentUserId) ?? "",
            );
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3.5 rounded-[26px] px-3 py-3 text-start transition-all active:scale-[0.99]",
                  c.unread > 0 ? "bg-surface-2/70" : "active:bg-surface-2/60",
                )}
              >
                <span className="relative shrink-0">
                  <span
                    className="flex size-13 items-center justify-center rounded-2xl text-sm font-bold text-primary-foreground"
                    style={{
                      backgroundColor:
                        c.kind === "group" ? "#0ea5a5" : other?.color,
                      width: 52,
                      height: 52,
                    }}
                  >
                    {c.kind === "group" ? (
                      <Users2 className="size-5" />
                    ) : (
                      initials(other?.name ?? "؟")
                    )}
                  </span>
                  {c.kind === "direct" && other?.online && (
                    <span className="absolute -bottom-0.5 -start-0.5 size-4 rounded-full border-[3px] border-background bg-primary" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-display truncate text-[15px] font-semibold">
                      {conversationTitle(c)}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      {last ? formatTime(last.createdAt) : ""}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {last?.revoked
                        ? "تم سحب الرسالة"
                        : (last?.text ??
                          (last?.attachment
                            ? `مرفق · ${last.attachment.name}`
                            : "لا رسائل"))}
                    </span>
                    {c.unread > 0 && (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </AppShell>
    );
  }

  /* ---------- Thread ---------- */
  const other = userById(
    active.memberIds.find((id) => id !== currentUserId) ?? "",
  );

  return (
    <AppShell
      padded={false}
      hideTabs
      header={
        <header className="pt-safe shrink-0 bg-background px-6 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="رجوع"
              className="grid size-10 place-items-center rounded-full bg-surface-2 transition-transform active:scale-95"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-primary">
              <ShieldCheck className="size-[18px]" />
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-primary-foreground"
              style={{
                backgroundColor:
                  active.kind === "group" ? "#0ea5a5" : other?.color,
              }}
            >
              {active.kind === "group" ? (
                <Users2 className="size-5" />
              ) : (
                initials(other?.name ?? "؟")
              )}
            </span>
            <div className="min-w-0">
              <h1 className="font-display truncate text-[22px] font-semibold">
                {conversationTitle(active)}
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5">
                {active.kind === "direct" && other?.online && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
                <span className="truncate text-xs text-muted-foreground">
                  {active.kind === "group"
                    ? `${active.memberIds.length} أعضاء`
                    : other?.online
                      ? "متصل الآن"
                      : (other?.title ?? "")}
                </span>
              </div>
            </div>
          </div>
        </header>
      }
    >
      <div className="chat-paper min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
        {thread.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            لا توجد رسائل بعد.
          </p>
        )}
        {thread.map((m, i) => (
          <div key={m.id} className="space-y-1">
            {(i === 0 ||
              new Date(thread[i - 1]!.createdAt).getDate() !==
                new Date(m.createdAt).getDate()) && (
              <div className="flex justify-center py-2">
                <span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                  {relative(m.createdAt)}
                </span>
              </div>
            )}
            <MessageItem
              message={m}
              showSender={
                active.kind === "group" ||
                thread[i - 1]?.senderId !== m.senderId
              }
              onOpen={openAttachment}
            />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <Composer conversationId={active.id} />

      {masked && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black text-white">
          <EyeOff className="size-10 text-white/70" />
          <div className="px-10 text-center">
            <p className="font-display text-lg font-semibold">محتوى محمي</p>
            <p className="mt-1.5 text-xs leading-6 text-white/60">
              تم تعتيم المحادثة لحماية الرسائل من الالتقاط. كل محاولة تُسجَّل
              باسمك في سجل التدقيق.
            </p>
          </div>
          <Button
            onClick={reveal}
            size="sm"
            className="rounded-full px-6 text-white"
          >
            عرض المحادثة
          </Button>
        </div>
      )}

      {viewing && (
        <ProtectedViewer message={viewing} onClose={() => setViewing(null)} />
      )}
    </AppShell>
  );
}
