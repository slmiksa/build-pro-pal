import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildSeed } from "@/data/seed";
import type {
  Attachment,
  AuditEvent,
  AuditType,
  Conversation,
  Invite,
  Message,
  Policy,
  User,
  UserId,
} from "@/lib/types";

/**
 * Demo data layer. Everything lives in memory for this preview build; the
 * shape of these actions mirrors what a real backend would expose, so the UI
 * does not change when persistence is added later.
 */

type AuditExtra = {
  actorId?: string | undefined;
  conversationId?: string | undefined;
  messageId?: string | undefined;
};

type Ctx = {
  ready: boolean;
  users: User[];
  conversations: Conversation[];
  messages: Message[];
  audit: AuditEvent[];
  invites: Invite[];
  currentUserId: UserId | null;
  currentUser: User | null;
  signIn: (email: string) => boolean;
  signOut: () => void;
  userById: (id: UserId) => User | undefined;
  conversationTitle: (c: Conversation) => string;
  sendMessage: (input: {
    conversationId: string;
    text?: string | undefined;
    attachment?: Attachment | undefined;
    policy: Policy;
  }) => void;
  revokeMessage: (id: string) => void;
  markRead: (conversationId: string) => void;
  registerOpen: (messageId: string) => "ok" | "limit";
  log: (type: AuditType, detail: string, extra?: AuditExtra | undefined) => void;
  addMember: (input: { name: string; email: string; title: string }) => void;
  toggleMemberDisabled: (id: UserId) => void;
  createInvite: (email: string) => Invite;
  findInvite: (code: string) => Invite | undefined;
  consumeInvite: (code: string) => void;
};

const AppContext = createContext<Ctx | null>(null);

let counter = 0;
const nextId = (prefix: string) => `${prefix}${++counter}-${Date.now()}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [seed] = useState(() => buildSeed(Date.now()));
  const [users, setUsers] = useState<User[]>(seed.users);
  const [conversations, setConversations] = useState<Conversation[]>(
    seed.conversations,
  );
  const [messages, setMessages] = useState<Message[]>(seed.messages);
  const [audit, setAudit] = useState<AuditEvent[]>(seed.audit);
  const [invites, setInvites] = useState<Invite[]>(seed.invites);
  const [currentUserId, setCurrentUserId] = useState<UserId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  // Expire self-destructing messages on a ticker.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const log = useCallback<Ctx["log"]>((type, detail, extra) => {
    setAudit((prev) => [
      {
        id: nextId("e"),
        type,
        actorId: extra?.actorId ?? "u1",
        at: Date.now(),
        detail,
        conversationId: extra?.conversationId,
        messageId: extra?.messageId,
      },
      ...prev,
    ]);
  }, []);

  const signIn = useCallback<Ctx["signIn"]>(
    (email) => {
      const normalized = email.trim().toLowerCase();
      const found = users.find((u) => u.email.toLowerCase() === normalized);
      const user = found ?? users[0];
      if (!user || user.disabled) return false;
      setCurrentUserId(user.id);
      log("login", "تسجيل دخول ناجح", { actorId: user.id });
      return true;
    },
    [users, log],
  );

  const signOut = useCallback(() => setCurrentUserId(null), []);

  const userById = useCallback(
    (id: UserId) => users.find((u) => u.id === id),
    [users],
  );

  const conversationTitle = useCallback(
    (c: Conversation) => {
      if (c.kind === "group") return c.name ?? "مجموعة";
      const other = c.memberIds.find((id) => id !== (currentUserId ?? "u1"));
      return users.find((u) => u.id === other)?.name ?? "محادثة";
    },
    [users, currentUserId],
  );

  const sendMessage = useCallback<Ctx["sendMessage"]>(
    ({ conversationId, text, attachment, policy }) => {
      const now = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("m"),
          conversationId,
          senderId: currentUserId ?? "u1",
          text,
          attachment,
          createdAt: now,
          expiresAt:
            policy.expiresInMin > 0
              ? now + policy.expiresInMin * 60_000
              : undefined,
          revoked: false,
          policy,
          readBy: [currentUserId ?? "u1"],
          opens: 0,
        },
      ]);
    },
    [currentUserId],
  );

  const revokeMessage = useCallback<Ctx["revokeMessage"]>(
    (id) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, revoked: true, text: undefined, attachment: undefined }
            : m,
        ),
      );
      log("message_revoked", "سحب رسالة للجميع", { messageId: id });
    },
    [log],
  );

  const markRead = useCallback<Ctx["markRead"]>(
    (conversationId) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      );
      const me = currentUserId ?? "u1";
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === conversationId && !m.readBy.includes(me)
            ? { ...m, readBy: [...m.readBy, me] }
            : m,
        ),
      );
    },
    [currentUserId],
  );

  const registerOpen = useCallback<Ctx["registerOpen"]>(
    (messageId) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return "limit";
      const limit = msg.policy.maxOpens;
      if (limit > 0 && msg.opens >= limit) return "limit";
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, opens: m.opens + 1 } : m)),
      );
      log(
        "file_open",
        `فتح «${msg.attachment?.name ?? "مرفق"}»${
          limit > 0 ? ` — الفتح ${msg.opens + 1} من ${limit}` : ""
        }`,
        { messageId, conversationId: msg.conversationId },
      );
      return "ok";
    },
    [messages, log],
  );

  const addMember = useCallback<Ctx["addMember"]>(
    ({ name, email, title }) => {
      const id = nextId("u");
      setUsers((prev) => [
        ...prev,
        {
          id,
          name,
          email,
          title,
          role: "manager",
          online: false,
          disabled: false,
          color: "oklch(0.72 0.12 190)",
        },
      ]);
      log("member_added", `إضافة عضو جديد: ${name} (${email})`);
    },
    [log],
  );

  const toggleMemberDisabled = useCallback<Ctx["toggleMemberDisabled"]>(
    (id) => {
      let name = "";
      let willDisable = false;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;
          name = u.name;
          willDisable = !u.disabled;
          return { ...u, disabled: !u.disabled };
        }),
      );
      setTimeout(
        () =>
          log(
            "member_disabled",
            `${willDisable ? "تعطيل" : "تنشيط"} حساب ${name}`,
          ),
        0,
      );
    },
    [log],
  );

  const createInvite = useCallback<Ctx["createInvite"]>(
    (email) => {
      const now = Date.now();
      const code = `DR7-${Math.floor(1000 + Math.random() * 8999)
        .toString(36)
        .toUpperCase()}${Math.floor(10 + Math.random() * 89)}`;
      const invite: Invite = {
        id: nextId("i"),
        code,
        email,
        createdAt: now,
        expiresAt: now + 48 * 3_600_000,
        used: false,
      };
      setInvites((prev) => [invite, ...prev]);
      log("invite_created", `إنشاء رابط دعوة لـ ${email}`);
      return invite;
    },
    [log],
  );

  const findInvite = useCallback<Ctx["findInvite"]>(
    (code) => invites.find((i) => i.code.toLowerCase() === code.toLowerCase()),
    [invites],
  );

  const consumeInvite = useCallback<Ctx["consumeInvite"]>((code) => {
    setInvites((prev) =>
      prev.map((i) =>
        i.code.toLowerCase() === code.toLowerCase() ? { ...i, used: true } : i,
      ),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      users,
      conversations,
      messages,
      audit,
      invites,
      currentUserId,
      currentUser: users.find((u) => u.id === currentUserId) ?? null,
      signIn,
      signOut,
      userById,
      conversationTitle,
      sendMessage,
      revokeMessage,
      markRead,
      registerOpen,
      log,
      addMember,
      toggleMemberDisabled,
      createInvite,
      findInvite,
      consumeInvite,
    }),
    [
      ready,
      users,
      conversations,
      messages,
      audit,
      invites,
      currentUserId,
      signIn,
      signOut,
      userById,
      conversationTitle,
      sendMessage,
      revokeMessage,
      markRead,
      registerOpen,
      log,
      addMember,
      toggleMemberDisabled,
      createInvite,
      findInvite,
      consumeInvite,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function isExpired(m: Message, now = Date.now()) {
  return typeof m.expiresAt === "number" && m.expiresAt <= now;
}
