import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  EyeOff,
  Forward,
  Mail,
  Pin,
  PinOff,
  Plus,
  Search,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/Composer";
import { MessageItem } from "@/components/MessageItem";
import { ProtectedViewer } from "@/components/ProtectedViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    togglePinned,
    registerOpen,
    startDirect,
    startDirectByEmail,
    createGroup,
    forwardMessage,
    isAdmin,
    log,
  } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Message | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Only jump to the newest message when the conversation changes or the user
  // is already reading at the bottom — never yank them away from older messages.
  const prevConvRef = useRef<string | null>(null);
  const nearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  useEffect(() => {
    if (prevConvRef.current !== activeId) {
      prevConvRef.current = activeId;
      endRef.current?.scrollIntoView({ block: "end" });
      return;
    }
    if (nearBottom()) endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, activeId]);

  // Keep the newest message visible when the on-screen keyboard opens/closes.
  useEffect(() => {
    if (!activeId) return;
    const toEnd = () => {
      if (!nearBottom()) return;
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }),
      );
      window.setTimeout(() => {
        if (nearBottom()) endRef.current?.scrollIntoView({ block: "end" });
      }, 280);
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", toEnd);
    document.addEventListener("focusin", toEnd);
    return () => {
      vv?.removeEventListener("resize", toEnd);
      document.removeEventListener("focusin", toEnd);
    };
  }, [activeId]);


  const lastAt = (id: string) =>
    visible.filter((m) => m.conversationId === id).slice(-1)[0]?.createdAt ?? 0;

  const list = conversations
    .filter((c) => conversationTitle(c).includes(query.trim()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return lastAt(b.id) - lastAt(a.id);
    });

  const openAttachment = async (m: Message) => {
    if ((await registerOpen(m.id)) === "limit") {
      toast.error("انتهى عدد مرات الفتح المسموحة لهذا الملف");
      return;
    }
    setViewing(m);
  };

  const submitEmail = async () => {
    if (busy) return;
    setBusy(true);
    const res = await startDirectByEmail(email);
    setBusy(false);
    if (res.error || !res.id) {
      toast.error(res.error ?? "تعذّر بدء المحادثة");
      return;
    }
    setEmail("");
    setNewOpen(false);
    setActiveId(res.id);
  };

  const submitGroup = async () => {
    if (busy) return;
    setBusy(true);
    const res = await createGroup({ name: groupName, memberIds: groupMembers });
    setBusy(false);
    if (res.error || !res.id) {
      toast.error(res.error ?? "تعذّر إنشاء المجموعة");
      return;
    }
    toast.success("تم إنشاء المجموعة");
    setGroupName("");
    setGroupMembers([]);
    setNewOpen(false);
    setActiveId(res.id);
  };

  const submitForward = async (targetId: string) => {
    if (!forwarding) return;
    const err = await forwardMessage(forwarding.id, targetId);
    setForwarding(null);
    if (err) toast.error(err);
    else toast.success("تمت إعادة التوجيه");
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
          <div className="mb-2 flex items-center gap-2">
            <Button
              onClick={() => setNewOpen(true)}
              className="h-10 flex-1 gap-2 rounded-2xl"
            >
              <Plus className="size-4" />
              {isAdmin ? "محادثة أو مجموعة جديدة" : "محادثة خاصة جديدة"}
            </Button>
          </div>
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
              <div
                key={c.id}
                className={cn(
                  "flex w-full items-center gap-1 rounded-[26px] pe-1 transition-all",
                  c.unread > 0 ? "bg-surface-2/70" : "",
                )}
              >
              <button
                onClick={() => setActiveId(c.id)}
                className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[26px] px-3 py-3 text-start transition-all active:scale-[0.99] active:bg-surface-2/60"
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
              <button
                type="button"
                onClick={() => void togglePinned(c.id)}
                aria-label={c.pinned ? "إلغاء التثبيت" : "تثبيت المحادثة"}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                  c.pinned ? "text-primary" : "text-muted-foreground/50",
                )}
              >
                {c.pinned ? (
                  <PinOff className="size-4" />
                ) : (
                  <Pin className="size-4" />
                )}
              </button>
              </div>
            );
          })}
        </div>

        <NewChatDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          isAdmin={isAdmin}
          email={email}
          setEmail={setEmail}
          onSubmitEmail={submitEmail}
          groupName={groupName}
          setGroupName={setGroupName}
          groupMembers={groupMembers}
          setGroupMembers={setGroupMembers}
          onSubmitGroup={submitGroup}
          people={users.filter((u) => u.id !== currentUserId && !u.disabled)}
          busy={busy}
        />
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
      <div
        ref={scrollRef}
        className="chat-paper min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4"
      >
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
              onForward={(msg) => setForwarding(msg)}
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

      <Dialog
        open={Boolean(forwarding)}
        onOpenChange={(o) => !o && setForwarding(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="size-4 text-primary" /> إعادة توجيه الرسالة
            </DialogTitle>
            <DialogDescription>
              تنتقل الرسالة بنفس صلاحيات الحماية الأصلية.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {conversations
              .filter((c) => c.id !== active.id)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => void submitForward(c.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-surface-2"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-primary">
                    {c.kind === "group" ? (
                      <Users2 className="size-4" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {conversationTitle(c)}
                  </span>
                </button>
              ))}
            {conversations.length <= 1 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا توجد محادثة أخرى لإعادة التوجيه إليها.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function NewChatDialog({
  open,
  onOpenChange,
  isAdmin,
  email,
  setEmail,
  onSubmitEmail,
  groupName,
  setGroupName,
  groupMembers,
  setGroupMembers,
  onSubmitGroup,
  people,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdmin: boolean;
  email: string;
  setEmail: (v: string) => void;
  onSubmitEmail: () => void | Promise<void>;
  groupName: string;
  setGroupName: (v: string) => void;
  groupMembers: string[];
  setGroupMembers: (v: string[]) => void;
  onSubmitGroup: () => void | Promise<void>;
  people: { id: string; name: string; title: string; email: string; color: string }[];
  busy: boolean;
}) {
  const toggle = (id: string) =>
    setGroupMembers(
      groupMembers.includes(id)
        ? groupMembers.filter((m) => m !== id)
        : [...groupMembers, id],
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>محادثة جديدة</DialogTitle>
          <DialogDescription>
            راسل زميلاً عبر بريده، أو أنشئ مجموعة عمل.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct">
          <TabsList className="w-full">
            <TabsTrigger value="direct" className="flex-1">
              محادثة خاصة
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="group" className="flex-1">
                مجموعة
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="direct" className="space-y-3 pt-3">
            <Input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="h-11 text-start"
            />
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => void onSubmitEmail()}
            >
              بدء المحادثة
            </Button>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="group" className="space-y-3 pt-3">
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="اسم المجموعة"
                className="h-11"
              />
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                {people.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    لا يوجد أعضاء مفعّلون بعد.
                  </p>
                )}
                {people.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start transition-colors",
                      groupMembers.includes(u.id) ? "bg-primary/10" : "hover:bg-surface-2",
                    )}
                  >
                    <span
                      className="flex size-7 items-center justify-center rounded-lg text-[10px] font-bold text-primary-foreground"
                      style={{ backgroundColor: u.color }}
                    >
                      {initials(u.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {u.title}
                      </span>
                    </span>
                    {groupMembers.includes(u.id) && (
                      <span className="text-[10px] font-semibold text-primary">مضاف</span>
                    )}
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                disabled={busy || !groupName.trim() || groupMembers.length === 0}
                onClick={() => void onSubmitGroup()}
              >
                إنشاء المجموعة
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
