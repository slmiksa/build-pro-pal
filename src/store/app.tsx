import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
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
 * Real data layer backed by Supabase. The action names mirror the previous
 * in-memory store so the UI stays unchanged; everything is now persisted,
 * row-level-secured and pushed live over realtime.
 */

const BUCKET = "attachments";
const PALETTE = [
  "oklch(0.72 0.13 165)",
  "oklch(0.7 0.14 250)",
  "oklch(0.72 0.12 60)",
  "oklch(0.68 0.15 20)",
  "oklch(0.7 0.13 300)",
  "oklch(0.72 0.12 190)",
];

type AuditExtra = {
  actorId?: string | undefined;
  conversationId?: string | undefined;
  messageId?: string | undefined;
};

type StoredAttachment = Attachment & { path?: string | undefined };

type Ctx = {
  ready: boolean;
  loading: boolean;
  users: User[];
  conversations: Conversation[];
  messages: Message[];
  audit: AuditEvent[];
  invites: Invite[];
  currentUserId: UserId | null;
  currentUser: User | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    title?: string | undefined;
  }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  userById: (id: UserId) => User | undefined;
  conversationTitle: (c: Conversation) => string;
  refresh: () => Promise<void>;
  startDirect: (otherId: UserId) => Promise<string | null>;
  sendMessage: (input: {
    conversationId: string;
    text?: string | undefined;
    attachment?: Attachment | undefined;
    file?: File | Blob | undefined;
    policy: Policy;
  }) => Promise<void>;
  revokeMessage: (id: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  registerOpen: (messageId: string) => Promise<"ok" | "limit">;
  log: (
    type: AuditType,
    detail: string,
    extra?: AuditExtra | undefined,
  ) => Promise<void>;
  addMember: (input: {
    name: string;
    email: string;
    title: string;
  }) => Promise<{ error: string | null; password?: string | undefined }>;
  resetMemberPassword: (email: string) => Promise<string | null>;
  toggleMemberDisabled: (id: UserId) => Promise<void>;
  createInvite: (email: string) => Promise<Invite | null>;
};

const AppContext = createContext<Ctx | null>(null);

const ms = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<UserId | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const loadingRef = useRef(false);

  /* ---------- session ---------- */
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCurrentUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      setCurrentUserId(session?.user.id ?? null);
      if (!session) {
        setUsers([]);
        setConversations([]);
        setMessages([]);
        setAudit([]);
        setInvites([]);
        setIsAdmin(false);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ---------- loading ---------- */
  const refresh = useCallback(async () => {
    const me = (await supabase.auth.getSession()).data.session?.user.id ?? null;
    if (!me) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const [
        profilesRes,
        rolesRes,
        convRes,
        memberRes,
        msgRes,
        readsRes,
        auditRes,
        invitesRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("conversations").select("*"),
        supabase.from("conversation_members").select("*"),
        supabase.from("messages").select("*").order("created_at"),
        supabase.from("message_reads").select("message_id, user_id"),
        supabase.from("audit_events").select("*").order("at", { ascending: false }).limit(500),
        supabase.from("invites").select("*").order("created_at", { ascending: false }),
      ]);

      const roleByUser = new Map<string, "admin" | "manager">();
      for (const r of rolesRes.data ?? []) {
        if (r.role === "admin") roleByUser.set(r.user_id, "admin");
        else if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, "manager");
      }
      setIsAdmin(roleByUser.get(me) === "admin");

      setUsers(
        (profilesRes.data ?? []).map((p) => ({
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          title: p.title,
          role: roleByUser.get(p.id) ?? "manager",
          online: p.online,
          disabled: p.disabled,
          color: p.color || colorFor(p.id),
        })),
      );

      const membersByConv = new Map<string, string[]>();
      const lastReadFor = new Map<string, number>();
      for (const m of memberRes.data ?? []) {
        const list = membersByConv.get(m.conversation_id) ?? [];
        list.push(m.user_id);
        membersByConv.set(m.conversation_id, list);
        if (m.user_id === me) lastReadFor.set(m.conversation_id, ms(m.last_read_at));
      }

      const readsByMessage = new Map<string, string[]>();
      for (const r of readsRes.data ?? []) {
        const list = readsByMessage.get(r.message_id) ?? [];
        list.push(r.user_id);
        readsByMessage.set(r.message_id, list);
      }

      // Resolve private attachment paths into short-lived signed URLs.
      const rows = msgRes.data ?? [];
      const paths: string[] = [];
      for (const r of rows) {
        const att = r.attachment as StoredAttachment | null;
        if (att?.path) paths.push(att.path);
      }
      const signed = new Map<string, string>();
      if (paths.length) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(paths, 3600);
        for (const s of data ?? []) {
          if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
        }
      }

      const mapped: Message[] = rows.map((r) => {
        const raw = r.attachment as StoredAttachment | null;
        const attachment: Attachment | undefined = raw
          ? {
              id: raw.id,
              kind: raw.kind,
              name: raw.name,
              size: raw.size,
              src: raw.path ? signed.get(raw.path) : raw.src,
              pages: raw.pages,
              durationSec: raw.durationSec,
            }
          : undefined;
        return {
          id: r.id,
          conversationId: r.conversation_id,
          senderId: r.sender_id,
          text: r.text ?? undefined,
          attachment,
          createdAt: ms(r.created_at),
          expiresAt: r.expires_at ? ms(r.expires_at) : undefined,
          revoked: r.revoked,
          policy: {
            allowDownload: r.allow_download,
            allowCopy: r.allow_copy,
            blockScreenshot: r.block_screenshot,
            watermark: r.watermark,
            expiresInMin: r.expires_in_min,
            maxOpens: r.max_opens,
          },
          readBy: readsByMessage.get(r.id) ?? [],
          opens: r.opens,
        };
      });
      setMessages(mapped);

      setConversations(
        (convRes.data ?? []).map((c) => {
          const lastRead = lastReadFor.get(c.id) ?? 0;
          const unread = mapped.filter(
            (m) =>
              m.conversationId === c.id &&
              m.senderId !== me &&
              m.createdAt > lastRead,
          ).length;
          return {
            id: c.id,
            kind: c.kind,
            name: c.name ?? undefined,
            memberIds: membersByConv.get(c.id) ?? [],
            unread,
          };
        }),
      );

      setAudit(
        (auditRes.data ?? []).map((e) => ({
          id: e.id,
          type: e.type as AuditType,
          actorId: e.actor_id,
          at: ms(e.at),
          conversationId: e.conversation_id ?? undefined,
          messageId: e.message_id ?? undefined,
          detail: e.detail,
        })),
      );

      setInvites(
        (invitesRes.data ?? []).map((i) => ({
          id: i.id,
          code: i.code,
          email: i.email,
          createdAt: ms(i.created_at),
          expiresAt: ms(i.expires_at),
          used: i.used,
        })),
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    void refresh();
  }, [currentUserId, refresh]);

  /* ---------- realtime ---------- */
  useEffect(() => {
    if (!currentUserId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 250);
    };
    const channel = supabase
      .channel("dir3-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, bump)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        bump,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_events" }, bump)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refresh]);

  // Ticker so self-destructing messages disappear on time.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------- actions ---------- */
  const log = useCallback<Ctx["log"]>(
    async (type, detail, extra) => {
      const actor = extra?.actorId ?? currentUserId;
      if (!actor) return;
      await supabase.from("audit_events").insert({
        type,
        actor_id: actor,
        detail,
        conversation_id: extra?.conversationId ?? null,
        message_id: extra?.messageId ?? null,
      });
    },
    [currentUserId],
  );

  const signIn = useCallback<Ctx["signIn"]>(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return "البريد أو كلمة المرور غير صحيحة";
    const uid = data.user?.id;
    if (uid) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("disabled")
        .eq("id", uid)
        .maybeSingle();
      if (profile?.disabled) {
        await supabase.auth.signOut();
        return "هذا الحساب معطّل، راجع مسؤول النظام";
      }
      await supabase.from("audit_events").insert({
        type: "login",
        actor_id: uid,
        detail: "تسجيل دخول ناجح",
      });
      await supabase.from("profiles").update({ online: true }).eq("id", uid);
    }
    return null;
  }, []);

  const signUp = useCallback<Ctx["signUp"]>(
    async ({ email, password, name, title }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name, title: title ?? "مدير" },
        },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (currentUserId) {
      await supabase.from("profiles").update({ online: false }).eq("id", currentUserId);
    }
    await supabase.auth.signOut();
    setCurrentUserId(null);
  }, [currentUserId]);

  const userById = useCallback(
    (id: UserId) => users.find((u) => u.id === id),
    [users],
  );

  const conversationTitle = useCallback(
    (c: Conversation) => {
      if (c.kind === "group") return c.name ?? "مجموعة";
      const other = c.memberIds.find((id) => id !== currentUserId);
      return users.find((u) => u.id === other)?.name ?? "محادثة";
    },
    [users, currentUserId],
  );

  const startDirect = useCallback<Ctx["startDirect"]>(
    async (otherId) => {
      if (!currentUserId || otherId === currentUserId) return null;
      const existing = conversations.find(
        (c) =>
          c.kind === "direct" &&
          c.memberIds.length === 2 &&
          c.memberIds.includes(otherId) &&
          c.memberIds.includes(currentUserId),
      );
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from("conversations")
        .insert({ kind: "direct", created_by: currentUserId })
        .select("id")
        .single();
      if (error || !data) return null;
      const { error: memberError } = await supabase
        .from("conversation_members")
        .insert([
          { conversation_id: data.id, user_id: currentUserId },
          { conversation_id: data.id, user_id: otherId },
        ]);
      if (memberError) return null;
      await refresh();
      return data.id;
    },
    [conversations, currentUserId, refresh],
  );

  const sendMessage = useCallback<Ctx["sendMessage"]>(
    async ({ conversationId, text, attachment, file, policy }) => {
      if (!currentUserId) return;
      let stored: StoredAttachment | null = attachment
        ? { ...attachment }
        : null;

      if (attachment && file) {
        const safe = attachment.name.replace(/[^\w.\-]+/g, "_");
        const path = `${conversationId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file instanceof File ? file.type : "application/octet-stream",
          upsert: false,
        });
        if (!error) stored = { ...attachment, src: undefined, path };
      }

      const expiresAt =
        policy.expiresInMin > 0
          ? new Date(Date.now() + policy.expiresInMin * 60_000).toISOString()
          : null;

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          text: text ?? null,
          attachment: (stored ?? null) as never,
          expires_at: expiresAt,
          allow_download: policy.allowDownload,
          allow_copy: policy.allowCopy,
          block_screenshot: policy.blockScreenshot,
          watermark: policy.watermark,
          expires_in_min: policy.expiresInMin,
          max_opens: policy.maxOpens,
        })
        .select("id")
        .single();
      if (!error && data) {
        await supabase
          .from("message_reads")
          .insert({ message_id: data.id, user_id: currentUserId });
      }
      await refresh();
    },
    [currentUserId, refresh],
  );

  const revokeMessage = useCallback<Ctx["revokeMessage"]>(
    async (id) => {
      await supabase
        .from("messages")
        .update({ revoked: true, text: null, attachment: null })
        .eq("id", id);
      await log("message_revoked", "سحب رسالة للجميع", { messageId: id });
      await refresh();
    },
    [log, refresh],
  );

  const markRead = useCallback<Ctx["markRead"]>(
    async (conversationId) => {
      if (!currentUserId) return;
      await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId);

      const unreadIds = messages
        .filter(
          (m) => m.conversationId === conversationId && !m.readBy.includes(currentUserId),
        )
        .map((m) => m.id);
      if (unreadIds.length) {
        await supabase
          .from("message_reads")
          .upsert(
            unreadIds.map((id) => ({ message_id: id, user_id: currentUserId })),
            { onConflict: "message_id,user_id", ignoreDuplicates: true },
          );
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      );
    },
    [currentUserId, messages],
  );

  const registerOpen = useCallback<Ctx["registerOpen"]>(
    async (messageId) => {
      const msg = messages.find((m) => m.id === messageId);
      const { data, error } = await supabase.rpc("register_message_open", {
        _message_id: messageId,
      });
      if (error || data !== "ok") return "limit";
      const limit = msg?.policy.maxOpens ?? 0;
      await log(
        "file_open",
        `فتح «${msg?.attachment?.name ?? "مرفق"}»${
          limit > 0 ? ` — الفتح ${(msg?.opens ?? 0) + 1} من ${limit}` : ""
        }`,
        { messageId, conversationId: msg?.conversationId },
      );
      await refresh();
      return "ok";
    },
    [messages, log, refresh],
  );

  const addMember = useCallback<Ctx["addMember"]>(async ({ name, email, title }) => {
    const { createMember } = await import("@/lib/members.functions");
    try {
      const res = await createMember({ data: { name, email, title } });
      if (res.error) return { error: res.error };
      await refresh();
      return { error: null, password: res.password };
    } catch {
      return { error: "تعذّر إنشاء الحساب" };
    }
  }, [refresh]);

  const resetMemberPassword = useCallback<Ctx["resetMemberPassword"]>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? error.message : null;
  }, []);

  const toggleMemberDisabled = useCallback<Ctx["toggleMemberDisabled"]>(
    async (id) => {
      const user = users.find((u) => u.id === id);
      if (!user) return;
      const next = !user.disabled;
      const { error } = await supabase
        .from("profiles")
        .update({ disabled: next })
        .eq("id", id);
      if (error) return;
      await log("member_disabled", `${next ? "تعطيل" : "تنشيط"} حساب ${user.name}`);
      await refresh();
    },
    [users, log, refresh],
  );

  const createInvite = useCallback<Ctx["createInvite"]>(
    async (email) => {
      if (!currentUserId) return null;
      const code = `DR7-${Math.floor(1000 + Math.random() * 8999)
        .toString(36)
        .toUpperCase()}${Math.floor(10 + Math.random() * 89)}`;
      const { data, error } = await supabase
        .from("invites")
        .insert({ code, email, created_by: currentUserId })
        .select("*")
        .single();
      if (error || !data) return null;
      await log("invite_created", `إنشاء رابط دعوة لـ ${email}`);
      await refresh();
      return {
        id: data.id,
        code: data.code,
        email: data.email,
        createdAt: ms(data.created_at),
        expiresAt: ms(data.expires_at),
        used: data.used,
      };
    },
    [currentUserId, log, refresh],
  );

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;

  const value = useMemo<Ctx>(
    () => ({
      ready,
      loading,
      users,
      conversations,
      messages,
      audit,
      invites,
      currentUserId,
      currentUser,
      isAdmin,
      signIn,
      signUp,
      signOut,
      userById,
      conversationTitle,
      refresh,
      startDirect,
      sendMessage,
      revokeMessage,
      markRead,
      registerOpen,
      log,
      addMember,
      resetMemberPassword,
      toggleMemberDisabled,
      createInvite,
    }),
    [
      ready,
      loading,
      users,
      conversations,
      messages,
      audit,
      invites,
      currentUserId,
      currentUser,
      isAdmin,
      signIn,
      signUp,
      signOut,
      userById,
      conversationTitle,
      refresh,
      startDirect,
      sendMessage,
      revokeMessage,
      markRead,
      registerOpen,
      log,
      addMember,
      resetMemberPassword,
      toggleMemberDisabled,
      createInvite,
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
