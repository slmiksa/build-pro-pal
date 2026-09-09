import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Context,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { showMessageNotification } from "@/lib/notifications";
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
  allowedDomains: string[];
  setAllowedDomains: (domains: string[]) => Promise<string | null>;
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
  startDirectByEmail: (
    email: string,
  ) => Promise<{ id: string | null; error: string | null }>;
  createGroup: (input: {
    name: string;
    memberIds: UserId[];
  }) => Promise<{ id: string | null; error: string | null }>;
  updateGroupMembers: (
    conversationId: string,
    memberIds: UserId[],
  ) => Promise<string | null>;
  forwardMessage: (
    messageId: string,
    targetConversationId: string,
  ) => Promise<string | null>;
  sendMessage: (input: {
    conversationId: string;
    text?: string | undefined;
    attachment?: Attachment | undefined;
    file?: File | Blob | undefined;
    mentions?: UserId[] | undefined;
    policy: Policy;
  }) => Promise<void>;
  revokeMessage: (id: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  togglePinned: (conversationId: string) => Promise<void>;
  registerOpen: (messageId: string) => Promise<"ok" | "limit">;
  /** Fetches the real file bytes from private storage. */
  fetchAttachment: (path: string) => Promise<Blob | null>;
  log: (
    type: AuditType,
    detail: string,
    extra?: AuditExtra | undefined,
  ) => Promise<void>;
  addMember: (input: {
    name: string;
    email: string;
    title: string;
    password: string;
  }) => Promise<{ error: string | null }>;
  resetMemberPassword: (
    userId: UserId,
    password: string,
  ) => Promise<string | null>;
  toggleMemberDisabled: (id: UserId) => Promise<void>;
  setDirectoryFlags: (
    id: UserId,
    patch: { canBrowseDirectory?: boolean; hiddenInDirectory?: boolean },
  ) => Promise<void>;
  createInvite: (email: string) => Promise<Invite | null>;
};

// Keep a single context instance even if this module is evaluated twice
// (route code-splitting / HMR can create duplicate module instances).
const globalCtxStore = globalThis as unknown as {
  __dir3AppContext?: Context<Ctx | null>;
};
const AppContext: Context<Ctx | null> =
  globalCtxStore.__dir3AppContext ??
  (globalCtxStore.__dir3AppContext = createContext<Ctx | null>(null));

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
  const [allowedDomains, setAllowedDomainsState] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const loadingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const currentUserRef = useRef<UserId | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const usersRef = useRef<User[]>([]);
  messagesRef.current = messages;
  currentUserRef.current = currentUserId;
  conversationsRef.current = conversations;
  usersRef.current = users;


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
    const session = (await supabase.auth.getSession()).data.session;
    const me = session?.user.id ?? null;
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
        settingsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("conversations").select("*"),
        supabase.from("conversation_members").select("*"),
        supabase.from("messages").select("*").order("created_at"),
        supabase.from("message_reads").select("message_id, user_id"),
        supabase.from("audit_events").select("*").order("at", { ascending: false }).limit(500),
        supabase.from("invites").select("*").order("created_at", { ascending: false }),
        supabase.from("org_settings").select("allowed_domains").limit(1).maybeSingle(),
      ]);

      const roleByUser = new Map<string, "admin" | "manager">();
      for (const r of rolesRes.data ?? []) {
        if (r.role === "admin") roleByUser.set(r.user_id, "admin");
        else if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, "manager");
      }
      setIsAdmin(roleByUser.get(me) === "admin");

      const loadedUsers: User[] = (profilesRes.data ?? []).map((p) => ({
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          title: p.title,
          role: roleByUser.get(p.id) ?? "manager",
          online: p.online,
          disabled: p.disabled,
          canBrowseDirectory: p.can_browse_directory ?? true,
          hiddenInDirectory: p.hidden_in_directory ?? false,
          color: p.color || colorFor(p.id),
        }));

      // Never strand an authenticated user on the loading screen if a profile
      // read is temporarily unavailable. The database profile replaces this
      // session-derived fallback as soon as the next refresh succeeds.
      if (!loadedUsers.some((user) => user.id === me)) {
        const metadata = session?.user.user_metadata;
        const email = session?.user.email ?? "";
        loadedUsers.push({
          id: me,
          name:
            typeof metadata?.["name"] === "string" && metadata["name"].trim()
              ? metadata["name"]
              : email.split("@")[0] || "مستخدم",
          email,
          title: typeof metadata?.["title"] === "string" ? metadata["title"] : "",
          role: roleByUser.get(me) ?? "manager",
          online: true,
          disabled: false,
          canBrowseDirectory: false,
          hiddenInDirectory: false,
          color: colorFor(me),
        });
      }
      setUsers(loadedUsers);

      const membersByConv = new Map<string, string[]>();
      const lastReadFor = new Map<string, number>();
      const pinnedFor = new Set<string>();
      for (const m of memberRes.data ?? []) {
        const list = membersByConv.get(m.conversation_id) ?? [];
        list.push(m.user_id);
        membersByConv.set(m.conversation_id, list);
        if (m.user_id === me) {
          lastReadFor.set(m.conversation_id, ms(m.last_read_at));
          if ((m as { pinned?: boolean }).pinned) pinnedFor.add(m.conversation_id);
        }
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
              path: raw.path,
              mime: raw.mime,
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
            allowForward: r.allow_forward,
            blockScreenshot: r.block_screenshot,
            watermark: r.watermark,
            expiresInMin: r.expires_in_min,
            maxOpens: r.max_opens,
          },
          readBy: readsByMessage.get(r.id) ?? [],
          opens: r.opens,
          mentions: (r.mentions ?? []) as string[],
          forwardedFrom: r.forwarded_from ?? undefined,
        };
      });
      setMessages(mapped);

      const allConversations = (convRes.data ?? []).map((c) => {
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
          pinned: pinnedFor.has(c.id),
        };
      });

      // Collapse duplicate one-to-one chats with the same person into the
      // conversation that actually holds the history.
      const activityOf = (id: string) => {
        const list = mapped.filter((m) => m.conversationId === id);
        return {
          count: list.length,
          last: list.length ? (list[list.length - 1]?.createdAt ?? 0) : 0,
        };
      };
      const byPeer = new Map<string, (typeof allConversations)[number]>();
      const deduped: typeof allConversations = [];
      for (const c of allConversations) {
        const peer =
          c.kind === "direct"
            ? c.memberIds.filter((id) => id !== me).sort().join(",")
            : null;
        if (!peer) {
          deduped.push(c);
          continue;
        }
        const kept = byPeer.get(peer);
        if (!kept) {
          byPeer.set(peer, c);
          continue;
        }
        const a = activityOf(kept.id);
        const b = activityOf(c.id);
        const winner =
          b.count > a.count || (b.count === a.count && b.last > a.last) ? c : kept;
        const loser = winner === c ? kept : c;
        byPeer.set(peer, {
          ...winner,
          unread: Math.max(winner.unread, loser.unread),
          pinned: winner.pinned || loser.pinned,
        });
      }
      setConversations([...deduped, ...byPeer.values()]);

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

      setAllowedDomainsState(settingsRes.data?.allowed_domains ?? []);
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
    const onMessage = (payload: { eventType: string; new: Record<string, unknown> }) => {
      bump();
      if (payload.eventType !== "INSERT") return;
      const row = payload.new;
      const senderId = row["sender_id"] as string | undefined;
      const convId = row["conversation_id"] as string | undefined;
      if (!senderId || !convId || senderId === currentUserId) return;
      const conv = conversationsRef.current.find((c) => c.id === convId);
      if (!conv || !conv.memberIds.includes(currentUserId)) return;
      const sender = usersRef.current.find((u) => u.id === senderId);
      const title =
        conv.kind === "group" && conv.name
          ? `${conv.name} · ${sender?.name ?? "رسالة جديدة"}`
          : (sender?.name ?? "رسالة جديدة");
      const body = row["attachment"]
        ? "أرسل لك ملفاً"
        : ((row["text"] as string | null) ?? "رسالة جديدة");
      showMessageNotification({ title, body, tag: convId });
    };
    const channel = supabase
      .channel("dir3-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        onMessage as never,
      )
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

      // Re-check against the database so a stale local list never creates a
      // second chat with the same person.
      const { data: mine } = await supabase
        .from("conversation_members")
        .select("conversation_id, conversations!inner(kind)")
        .eq("user_id", currentUserId);
      const mineIds = (mine ?? [])
        .filter(
          (r) =>
            (r as unknown as { conversations?: { kind?: string } }).conversations
              ?.kind === "direct",
        )
        .map((r) => r.conversation_id);
      if (mineIds.length) {
        const { data: theirs } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", otherId)
          .in("conversation_id", mineIds);
        const shared = theirs?.[0]?.conversation_id;
        if (shared) {
          await refresh();
          return shared;
        }
      }

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

  const startDirectByEmail = useCallback<Ctx["startDirectByEmail"]>(
    async (email) => {
      const clean = email.trim().toLowerCase();
      if (!clean) return { id: null, error: "اكتب البريد الإلكتروني" };
      const { data, error } = await supabase.rpc("find_profile_by_email", {
        _email: clean,
      });
      const found = Array.isArray(data) ? data[0] : null;
      if (error || !found) return { id: null, error: "لا يوجد عضو بهذا البريد" };
      if (found.id === currentUserId)
        return { id: null, error: "لا يمكنك مراسلة نفسك" };
      if (found.disabled) return { id: null, error: "هذا الحساب معطّل" };
      const id = await startDirect(found.id);
      return id
        ? { id, error: null }
        : { id: null, error: "تعذّر بدء المحادثة" };
    },
    [currentUserId, startDirect],
  );

  const createGroup = useCallback<Ctx["createGroup"]>(
    async ({ name, memberIds }) => {
      if (!currentUserId) return { id: null, error: "الجلسة منتهية" };
      if (!isAdmin) return { id: null, error: "إنشاء المجموعات للمسؤول فقط" };
      const title = name.trim();
      if (!title) return { id: null, error: "اكتب اسم المجموعة" };

      const { data, error } = await supabase
        .from("conversations")
        .insert({ kind: "group", name: title, created_by: currentUserId })
        .select("id")
        .single();
      if (error || !data) return { id: null, error: "تعذّر إنشاء المجموعة" };

      const unique = Array.from(new Set([currentUserId, ...memberIds]));
      const { error: memberError } = await supabase
        .from("conversation_members")
        .insert(
          unique.map((user_id) => ({ conversation_id: data.id, user_id })),
        );
      if (memberError) return { id: null, error: "تعذّرت إضافة الأعضاء" };

      await log("group_created", `إنشاء مجموعة «${title}» بـ ${unique.length} عضو`, {
        conversationId: data.id,
      });
      await refresh();
      return { id: data.id, error: null };
    },
    [currentUserId, isAdmin, log, refresh],
  );

  const updateGroupMembers = useCallback<Ctx["updateGroupMembers"]>(
    async (conversationId, memberIds) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return "المجموعة غير موجودة";
      const toAdd = memberIds.filter((id) => !conv.memberIds.includes(id));
      if (!toAdd.length) return null;
      const { error } = await supabase
        .from("conversation_members")
        .insert(toAdd.map((user_id) => ({ conversation_id: conversationId, user_id })));
      if (error) return "تعذّرت إضافة الأعضاء";
      await refresh();
      return null;
    },
    [conversations, refresh],
  );

  const forwardMessage = useCallback<Ctx["forwardMessage"]>(
    async (messageId, targetConversationId) => {
      const { error } = await supabase.rpc("forward_message", {
        _message_id: messageId,
        _target_conversation_id: targetConversationId,
      });
      if (error)
        return error.message.includes("not_allowed")
          ? "هذه الرسالة لا تسمح بإعادة التوجيه"
          : "تعذّرت إعادة التوجيه";
      await log("message_forwarded", "إعادة توجيه رسالة", {
        messageId,
        conversationId: targetConversationId,
      });
      await refresh();
      return null;
    },
    [log, refresh],
  );

  const sendMessage = useCallback<Ctx["sendMessage"]>(
    async ({ conversationId, text, attachment, file, mentions, policy }) => {
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
          allow_forward: policy.allowForward,
          mentions: mentions ?? [],
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

  // Stable identity: reads live message state from a ref so marking a thread
  // read can never re-trigger the effect that called it (refresh -> new
  // messages -> new callback -> mark again -> infinite loop / frozen tab).
  const togglePinned = useCallback<Ctx["togglePinned"]>(
    async (conversationId) => {
      const me = currentUserRef.current;
      if (!me) return;
      let next = false;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          next = !c.pinned;
          return { ...c, pinned: next };
        }),
      );
      await supabase
        .from("conversation_members")
        .update({ pinned: next })
        .eq("conversation_id", conversationId)
        .eq("user_id", me);
    },
    [],
  );

  const markRead = useCallback<Ctx["markRead"]>(
    async (conversationId) => {
      const me = currentUserRef.current;
      if (!me) return;
      const unreadIds = messagesRef.current
        .filter(
          (m) => m.conversationId === conversationId && !m.readBy.includes(me),
        )
        .map((m) => m.id);

      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      );

      await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", me);

      if (unreadIds.length) {
        await supabase
          .from("message_reads")
          .upsert(
            unreadIds.map((id) => ({ message_id: id, user_id: me })),
            { onConflict: "message_id,user_id", ignoreDuplicates: true },
          );
      }
    },
    [],
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

  const fetchAttachment = useCallback<Ctx["fetchAttachment"]>(async (path) => {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    return data;
  }, []);

  const addMember = useCallback<Ctx["addMember"]>(async ({ name, email, title, password }) => {
    const { createMember } = await import("@/lib/members.functions");
    try {
      const res = await createMember({ data: { name, email, title, password } });
      if (res.error) return { error: res.error };
      await refresh();
      return { error: null };
    } catch {
      return { error: "تعذّر إنشاء الحساب" };
    }
  }, [refresh]);

  const resetMemberPassword = useCallback<Ctx["resetMemberPassword"]>(
    async (userId, password) => {
      const { setMemberPassword } = await import("@/lib/members.functions");
      try {
        const res = await setMemberPassword({ data: { userId, password } });
        return res.error;
      } catch {
        return "تعذّر تغيير كلمة المرور";
      }
    },
    [],
  );

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

  const setDirectoryFlags = useCallback<Ctx["setDirectoryFlags"]>(
    async (id, patch) => {
      const user = users.find((u) => u.id === id);
      if (!user) return;
      const update: {
        can_browse_directory?: boolean;
        hidden_in_directory?: boolean;
      } = {};
      if (patch.canBrowseDirectory !== undefined)
        update.can_browse_directory = patch.canBrowseDirectory;
      if (patch.hiddenInDirectory !== undefined)
        update.hidden_in_directory = patch.hiddenInDirectory;
      if (Object.keys(update).length === 0) return;
      const { error } = await supabase.from("profiles").update(update).eq("id", id);
      if (error) return;
      await log("member_disabled", `تحديث ظهور الأعضاء لحساب ${user.name}`);
      await refresh();
    },
    [users, log, refresh],
  );


  const setAllowedDomains = useCallback<Ctx["setAllowedDomains"]>(
    async (domains) => {
      const clean = Array.from(
        new Set(
          domains
            .map((d) => d.trim().toLowerCase().replace(/^@+/, ""))
            .filter(Boolean),
        ),
      );
      const { data: row } = await supabase
        .from("org_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      const { error } = row
        ? await supabase
            .from("org_settings")
            .update({ allowed_domains: clean })
            .eq("id", row.id)
        : await supabase
            .from("org_settings")
            .insert({ allowed_domains: clean });
      if (error) return error.message;
      setAllowedDomainsState(clean);
      return null;
    },
    [],
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
      allowedDomains,
      setAllowedDomains,
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
      startDirectByEmail,
      createGroup,
      updateGroupMembers,
      forwardMessage,
      sendMessage,
      revokeMessage,
      markRead,
      togglePinned,
      registerOpen,
      fetchAttachment,
      log,
      addMember,
      resetMemberPassword,
      toggleMemberDisabled,
      setDirectoryFlags,
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
      allowedDomains,
      setAllowedDomains,
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
      startDirectByEmail,
      createGroup,
      updateGroupMembers,
      forwardMessage,
      sendMessage,
      revokeMessage,
      markRead,
      togglePinned,
      registerOpen,
      fetchAttachment,
      log,
      addMember,
      resetMemberPassword,
      toggleMemberDisabled,
      setDirectoryFlags,
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
