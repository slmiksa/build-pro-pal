import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
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
import { COMPANY_NAME } from "@/data/seed";
import { formatTime, relative } from "@/lib/format";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isExpired, useApp } from "@/store/app";
import { useCaptureWatch } from "@/hooks/use-capture-watch";
import { UserAvatar } from "@/components/UserAvatar";

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
    createInvite,
    forwardMessage,
    updateGroup,
    updateGroupMembers,
    setConversationRole,
    removeConversationMember,
    leaveConversation,
    deleteConversation,
    log,
  } = useApp();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Message | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const groupAvatarRef = useRef<HTMLInputElement>(null);


  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => messages.filter((m) => !isExpired(m)), [messages]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const thread = visible.filter((m) => m.conversationId === activeId);
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

  const jumpToEnd = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    endRef.current?.scrollIntoView({ block: "end" });
  };

  const lastMsg = thread[thread.length - 1];
  const lastMsgId = lastMsg?.id ?? null;
  const lastMine = lastMsg?.senderId === currentUserId;

  useEffect(() => {
    const convChanged = prevConvRef.current !== activeId;
    prevConvRef.current = activeId;
    // Jump when opening a conversation, when I just sent, or when already at
    // the bottom. Content (images/attachments) can grow after mount, so retry.
    if (!convChanged && !lastMine && !nearBottom()) return undefined;
    jumpToEnd();
    const r = requestAnimationFrame(jumpToEnd);
    const t1 = window.setTimeout(jumpToEnd, 60);
    const t2 = window.setTimeout(jumpToEnd, 250);
    const t3 = window.setTimeout(jumpToEnd, 600);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [lastMsgId, activeId, lastMine, thread.length]);

  // Content that grows after render (images, documents) must not leave the
  // newest message off-screen while the user is reading at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      if (nearBottom()) jumpToEnd();
    });
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [activeId]);


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

  const submitInvite = async () => {
    const target = inviteEmail.trim();
    if (!target.includes("@")) {
      toast.error("اكتب بريداً صحيحاً");
      return;
    }
    if (busy) return;
    setBusy(true);
    const inv = await createInvite(target);
    setBusy(false);
    if (!inv) {
      toast.error("تعذّر إنشاء رابط الدعوة");
      return;
    }
    const url = `${window.location.origin}/invite/${inv.code}`;
    void navigator.clipboard?.writeText(url);
    setInviteEmail("");
    toast.success("تم إنشاء رابط الدعوة ونسخه", { description: url });
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

  const other = active ? userById(active.memberIds.find((id) => id !== currentUserId) ?? "") : null;

  // Screenshot / recording detection inside a conversation (files opened in the
  // protected viewer are watched there with the file name attached).
  useCaptureWatch({
    enabled: Boolean(active) && !viewing,
    onAttempt: (reason) => {
      if (!active) return;
      toast.error("سُجلت محاولة التقاط شاشة", {
        description: "تم إبلاغ أعضاء المحادثة المعنيين باسمك ووقت المحاولة.",
      });
      void log("screenshot_attempt", `${reason} داخل «${conversationTitle(active)}»`, {
        conversationId: active.id,
      });
    },
  });



  const listPane = (
    <aside
      className={cn(
        "min-h-0 w-full shrink-0 flex-col border-e border-border bg-surface md:flex md:w-[300px] xl:w-[340px]",
        active ? "hidden" : "flex",
      )}
    >
      <div className="shrink-0 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث أو بدء محادثة جديدة"
              className="h-9 rounded-full border-transparent bg-surface-2 pe-10 text-[13px] shadow-none focus-visible:border-primary/30"
            />
          </div>
          <Button
            onClick={() => setNewOpen(true)}
            aria-label="محادثة جديدة"
            className="size-9 shrink-0 rounded-full p-0"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {list.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            {query.trim() ? "لا توجد محادثة بهذا الاسم." : "لا توجد محادثات بعد."}
          </p>
        )}
        {!query.trim() && list.length === 0 && (
          <div className="pt-4">
            <p className="px-4 pb-2 text-[11px] font-semibold text-muted-foreground">
              ابدأ محادثة مع زميل
            </p>
            {users
              .filter((u) => u.id !== currentUserId && !u.disabled)
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => void beginChat(u.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-surface-2/70"
                >
                  <UserAvatar
                    name={u.name}
                    color={u.color}
                    avatarUrl={u.avatarUrl}
                    className="size-10 text-[11px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {u.title}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        )}

        {list.map((c) => {
          const last = visible.filter((m) => m.conversationId === c.id).slice(-1)[0];
          const peer = userById(c.memberIds.find((id) => id !== currentUserId) ?? "");
          const selected = c.id === activeId;
          return (
            <div
              key={c.id}
              className={cn(
                "group flex w-full items-center border-b border-border/60 transition-colors",
                selected ? "bg-surface-2" : "hover:bg-surface-2/60",
              )}
            >
              <button
                onClick={() => setActiveId(c.id)}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-start"
              >
                <span className="relative shrink-0">
                  <UserAvatar
                    name={peer?.name ?? "؟"}
                    color={c.kind === "group" ? "#0ea5a5" : peer?.color}
                    avatarUrl={c.kind === "group" ? undefined : peer?.avatarUrl}
                    className="size-11 text-[12px]"
                    fallback={
                      c.kind === "group" ? <Users2 className="size-5" /> : undefined
                    }
                  />
                  {c.kind === "direct" && peer?.online && (
                    <span className="absolute -bottom-0.5 -start-0.5 size-3.5 rounded-full border-[3px] border-surface bg-primary" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-medium">{conversationTitle(c)}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        c.unread > 0 ? "font-semibold text-primary" : "text-muted-foreground",
                      )}
                    >
                      {last ? formatTime(last.createdAt) : ""}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] text-muted-foreground">
                      {last?.revoked
                        ? "تم سحب الرسالة"
                        : (last?.text ??
                          (last?.attachment ? `مرفق · ${last.attachment.name}` : "لا رسائل"))}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {c.pinned && <Pin className="size-3 text-muted-foreground" />}
                      {c.unread > 0 && (
                        <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => void togglePinned(c.id)}
                aria-label={c.pinned ? "إلغاء التثبيت" : "تثبيت المحادثة"}
                className={cn(
                  "me-1 grid size-8 shrink-0 place-items-center rounded-full opacity-0 transition-all group-hover:opacity-100 focus:opacity-100",
                  c.pinned ? "text-primary opacity-100" : "text-muted-foreground/60",
                )}
              >
                {c.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );

  const threadPane = (
    <section className={cn("min-h-0 min-w-0 flex-1 flex-col", active ? "flex" : "hidden md:flex")}>
      {!active ? (
        <div className="chat-paper flex min-h-0 flex-1 flex-col items-center justify-center gap-3 border-b-4 border-primary/60 px-8 text-center">
          <img
            src="/logo.png"
            alt="شعار درع"
            width={96}
            height={96}
            className="size-24 opacity-90"
          />
          <h2 className="font-display text-xl font-semibold">درع للتواصل</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            اختر محادثة من القائمة لبدء المراسلة. رسائلك وملفاتك محمية بصلاحيات تحددها أنت لكل
            رسالة.
          </p>
        </div>
      ) : (
        <>
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-2">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="رجوع"
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 md:hidden"
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setMembersOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-start transition-colors hover:bg-surface-2"
              aria-label="عرض أعضاء المحادثة"
            >
              <UserAvatar
                name={other?.name ?? "؟"}
                color={active.kind === "group" ? "#0ea5a5" : other?.color}
                avatarUrl={active.kind === "group" ? undefined : other?.avatarUrl}
                className="size-10 text-xs"
                fallback={
                  active.kind === "group" ? <Users2 className="size-5" /> : undefined
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {conversationTitle(active)}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {active.kind === "group"
                    ? `${active.memberIds.length} أعضاء · اضغط لعرضهم`
                    : other?.online
                      ? "متصل الآن"
                      : (other?.title ?? "")}
                </span>
              </span>
            </button>
            <span className="grid size-9 shrink-0 place-items-center rounded-full text-primary">
              <ShieldCheck className="size-[18px]" />
            </span>
          </header>

          <div
            ref={scrollRef}
            className="chat-paper min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:px-6"
          >
            <div className="mx-auto w-full max-w-3xl space-y-2">
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
                      <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-medium tracking-wide text-muted-foreground shadow-sm">
                        {relative(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageItem
                    message={m}
                    showSender={active.kind === "group" || thread[i - 1]?.senderId !== m.senderId}
                    onOpen={openAttachment}
                    onForward={(msg) => setForwarding(msg)}
                  />
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>

          <Composer conversationId={active.id} />
        </>
      )}
    </section>
  );

  return (
    <AppShell
      title="المحادثات"
      subtitle={`${COMPANY_NAME} · تواصل داخلي محمي`}
      padded={false}
      hideTabs={Boolean(active)}
    >
      <div className="flex h-full min-h-0 flex-1 overflow-hidden">
        {listPane}
        {threadPane}
      </div>

      <NewChatDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        onSubmitInvite={submitInvite}
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

      {viewing && <ProtectedViewer message={viewing} onClose={() => setViewing(null)} />}

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="size-4 text-primary" /> أعضاء المحادثة
            </DialogTitle>
            <DialogDescription>
              اضغط «مراسلة» لفتح محادثة خاصة مع أي عضو.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {(active?.memberIds ?? []).map((id) => {
              const u = userById(id);
              const isMe = id === currentUserId;
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2"
                >
                  <UserAvatar
                    name={u?.name ?? "؟"}
                    color={u?.color}
                    avatarUrl={u?.avatarUrl}
                    className="size-9 text-[11px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {u?.name ?? "عضو"} {isMe && "(أنت)"}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {u?.title ?? ""}
                    </span>
                  </span>
                  {!isMe && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 rounded-full px-3 text-[12px]"
                      onClick={() => {
                        setMembersOpen(false);
                        void beginChat(id);
                      }}
                    >
                      مراسلة
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>



      <Dialog open={Boolean(forwarding)} onOpenChange={(o) => !o && setForwarding(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forward className="size-4 text-primary" /> إعادة توجيه الرسالة
            </DialogTitle>
            <DialogDescription>تنتقل الرسالة بنفس صلاحيات الحماية الأصلية.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {conversations
              .filter((c) => c.id !== activeId)
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
                  <span className="truncate text-sm font-medium">{conversationTitle(c)}</span>
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
  email,
  setEmail,
  onSubmitEmail,
  groupName,
  setGroupName,
  groupMembers,
  setGroupMembers,
  onSubmitGroup,
  inviteEmail,
  setInviteEmail,
  onSubmitInvite,
  people,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  setEmail: (v: string) => void;
  onSubmitEmail: () => void | Promise<void>;
  groupName: string;
  setGroupName: (v: string) => void;
  groupMembers: string[];
  setGroupMembers: (v: string[]) => void;
  onSubmitGroup: () => void | Promise<void>;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  onSubmitInvite: () => void | Promise<void>;
  people: {
    id: string;
    name: string;
    title: string;
    email: string;
    color: string;
    avatarUrl?: string | undefined;
  }[];
  busy: boolean;
}) {
  const toggle = (id: string) =>
    setGroupMembers(
      groupMembers.includes(id) ? groupMembers.filter((m) => m !== id) : [...groupMembers, id],
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>محادثة جديدة</DialogTitle>
          <DialogDescription>
            راسل زميلاً عبر بريده، أنشئ مجموعة عمل، أو أرسل رابط دعوة.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct">
          <TabsList className="w-full">
            <TabsTrigger value="direct" className="flex-1">
              محادثة خاصة
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              مجموعة
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex-1">
              دعوة
            </TabsTrigger>
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
            <Button className="w-full" disabled={busy} onClick={() => void onSubmitEmail()}>
              بدء المحادثة
            </Button>
          </TabsContent>

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
                  <UserAvatar
                    name={u.name}
                    color={u.color}
                    avatarUrl={u.avatarUrl}
                    className="size-7 rounded-lg text-[10px]"
                  />
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

          <TabsContent value="invite" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              أنشئ رابط دعوة صالحاً 48 ساعة وأرسله لمن تريد انضمامه.
            </p>
            <Input
              type="email"
              dir="ltr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
              className="h-11 text-start"
            />
            <Button className="w-full" disabled={busy} onClick={() => void onSubmitInvite()}>
              إنشاء رابط الدعوة ونسخه
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
