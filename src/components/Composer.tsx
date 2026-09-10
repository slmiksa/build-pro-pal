import { useMemo, useRef, useState } from "react";
import { Mic, Paperclip, Send, ShieldCheck, Smile, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PolicyPanel } from "@/components/PolicyPanel";
import { policyItems } from "@/components/PolicyBadges";
import { defaultPolicy, type Attachment, type Policy, type User } from "@/lib/types";
import { initials } from "@/lib/format";
import { useApp } from "@/store/app";

function guessKind(name: string): Attachment["kind"] {
  const n = name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg)$/.test(n)) return "image";
  if (n.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx?|csv)$/.test(n)) return "sheet";
  return "doc";
}

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "😉",
  "😊",
  "😇",
  "🥰",
  "😍",
  "😘",
  "😗",
  "🤗",
  "🤩",
  "🤔",
  "🤨",
  "😐",
  "😴",
  "🥲",
  "😢",
  "😭",
  "😤",
  "😠",
  "🤯",
  "😳",
  "🥵",
  "🤝",
  "🙏",
  "👍",
  "👎",
  "👌",
  "✌️",
  "🤞",
  "💪",
  "👏",
  "🙌",
  "☝️",
  "👋",
  "🫡",
  "🤲",
  "❤️",
  "🧡",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "💯",
  "🔥",
  "✨",
  "⭐",
  "🎉",
  "🎊",
  "✅",
  "❌",
  "⚠️",
  "🔒",
  "🔐",
  "🛡️",
  "🕵️",
  "📎",
  "📄",
  "📁",
  "📊",
  "📷",
  "🎙️",
  "⏱️",
  "⏳",
  "📌",
  "💡",
  "🚀",
  "🏆",
  "☕",
  "🌙",
  "☀️",
  "🌟",
] as const;

export function Composer({ conversationId }: { conversationId: string }) {
  const { sendMessage, conversations, users, currentUserId } = useApp();
  const [text, setText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [pending, setPending] = useState<Attachment | null>(null);
  const [pendingFile, setPendingFile] = useState<File | Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);

  const conversation = conversations.find((c) => c.id === conversationId);
  const isGroup = conversation?.kind === "group";
  const members = useMemo<User[]>(
    () =>
      (conversation?.memberIds ?? [])
        .filter((id) => id !== currentUserId)
        .map((id) => users.find((u) => u.id === id))
        .filter((u): u is User => Boolean(u) && !u!.disabled),
    [conversation, users, currentUserId],
  );

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null || !isGroup) return [];
    const q = mentionQuery.trim().toLowerCase();
    return members
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, members, isGroup]);

  /** Users actually referenced by an @name still present in the text. */
  const mentionedIds = (body: string) =>
    members.filter((u) => body.includes(`@${u.name}`)).map((u) => u.id);

  const onTextChange = (value: string) => {
    setText(value);
    if (!isGroup) return;
    const upto = value.slice(0, inputRef.current?.selectionStart ?? value.length);
    const match = /(?:^|\s)@([^\s@]{0,30})$/.exec(upto);
    setMentionQuery(match ? (match[1] ?? "") : null);
  };

  const pickMention = (user: User) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const after = text.slice(caret);
    const replaced = before.replace(
      /(?:^|\s)@([^\s@]{0,30})$/,
      (whole) => `${whole.startsWith("@") ? "" : whole[0]}@${user.name} `,
    );
    setText(replaced + after);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const send = async () => {
    if (sending) return;
    if (!text.trim() && !pending) return;
    const body = text.trim();
    const att = pending;
    const file = pendingFile;
    setText("");
    setMentionQuery(null);
    setPending(null);
    setPendingFile(null);
    setSending(true);
    try {
      await sendMessage({
        conversationId,
        text: body || undefined,
        mentions: mentionedIds(body),
        attachment: att ?? undefined,
        file: file ?? undefined,
        policy,
      });
    } catch {
      toast.error("تعذّر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const pickFile = (file: File) => {
    const kind = guessKind(file.name);
    setPendingFile(file);
    setPending({
      id: `att-${Date.now()}`,
      kind,
      name: file.name,
      mime: file.type || undefined,
      size: `${Math.max(1, Math.round(file.size / 1024))} ك.ب`,
    });
  };

  const toggleRecording = async () => {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Safari records mp4, Chrome/Firefox webm — pick a type the browser supports
      // so the blob and its file name always match the real container.
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported?.(t));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (rec.mimeType || mimeType || "audio/webm").split(";")[0]!;
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type });
        setRecording(false);
        if (blob.size < 1024) {
          toast.error("التسجيل قصير جدًا، حاول مرة أخرى");
          return;
        }
        setPendingFile(blob);
        setPending({
          id: `voice-${Date.now()}`,
          kind: "audio",
          name: `ملاحظة صوتية.${ext}`,
          mime: type,
          size: `${Math.max(1, Math.round(blob.size / 1024))} ك.ب`,
          durationSec: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
        });
      };
      rec.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        toast.error("تعذّر التسجيل الصوتي");
      };
      startedAt.current = Date.now();
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("لم نتمكن من الوصول للميكروفون");
    }
  };


  const addEmoji = (emoji: string) => {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  };

  const activeCount = policyItems(policy).filter((i) => i.danger).length;

  return (
    <div className="pb-safe relative z-10 shrink-0 border-t border-border bg-background px-2.5 pt-2 sm:px-4 md:px-5">
      {mentionMatches.length > 0 && (
        <div className="mb-2 max-h-52 overflow-y-auto rounded-2xl border border-border bg-background p-1 shadow-lg">
          <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">
            ذكر عضو من المجموعة
          </p>
          {mentionMatches.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => pickMention(u)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition-colors hover:bg-surface-2 active:bg-surface-2"
            >
              <span
                className="flex size-7 items-center justify-center rounded-lg text-[10px] font-bold text-primary-foreground"
                style={{ backgroundColor: u.color }}
              >
                {initials(u.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{u.title}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {pending && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs">
          <Paperclip className="size-3.5 text-primary" />
          <span className="flex-1 truncate">
            {pending.name} · {pending.size}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => {
              setPending(null);
              setPendingFile(null);
            }}
            aria-label="إزالة المرفق"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="flex min-w-0 items-end gap-1.5 sm:gap-2">
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-[26px] bg-surface-2 px-1.5 py-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden size-9 shrink-0 rounded-full text-muted-foreground sm:inline-flex"
                aria-label="إيموجي"
              >
                <Smile className="size-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[19rem] p-2" align="start">
              <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="grid size-9 place-items-center rounded-lg text-xl transition-transform hover:bg-background active:scale-90"
                    onClick={() => addEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            ref={inputRef}
            onKeyDown={(e) => {
              // Enter = إرسال. Shift+Enter = سطر جديد.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (mentionMatches.length > 0 && mentionQuery !== null) {
                  pickMention(mentionMatches[0]!);
                  return;
                }
                send();
              }
            }}
            rows={1}
            placeholder={
              recording
                ? "جارٍ التسجيل…"
                : isGroup
                  ? "اكتب رسالة محمية… استخدم @ لذكر عضو"
                  : "اكتب رسالة محمية…"
            }
            className="max-h-28 min-h-9 min-w-0 flex-1 resize-none border-none bg-transparent px-1 py-2 text-[15px] font-medium shadow-none focus-visible:ring-0"
          />

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full text-muted-foreground"
            onClick={() => fileRef.current?.click()}
            aria-label="إرفاق ملف"
          >
            <Paperclip className="size-[18px]" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-9 shrink-0 rounded-full text-primary"
                aria-label="صلاحيات الحماية"
              >
                <ShieldCheck className="size-[18px]" />
                {activeCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <PolicyPanel policy={policy} onChange={setPolicy} />
            </PopoverContent>
          </Popover>
        </div>

        {text.trim() || pending ? (
          <Button
            size="icon"
            className="size-11 shrink-0 rounded-full"
            onClick={send}
            aria-label="إرسال"
          >
            <Send className="size-[18px]" />
          </Button>
        ) : (
          <Button
            variant={recording ? "destructive" : "default"}
            size="icon"
            className="size-11 shrink-0 rounded-full"
            onClick={toggleRecording}
            aria-label="تسجيل صوتي"
          >
            {recording ? <Square className="size-[18px]" /> : <Mic className="size-[18px]" />}
          </Button>
        )}
      </div>
    </div>
  );
}
