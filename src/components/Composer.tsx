import { useRef, useState } from "react";
import { Mic, Paperclip, Send, ShieldCheck, Smile, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PolicyPanel } from "@/components/PolicyPanel";
import { policyItems } from "@/components/PolicyBadges";
import { defaultPolicy, type Attachment, type Policy } from "@/lib/types";
import { useApp } from "@/store/app";

function guessKind(name: string): Attachment["kind"] {
  const n = name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|svg)$/.test(n)) return "image";
  if (n.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx?|csv)$/.test(n)) return "sheet";
  return "doc";
}

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😉","😊","😇","🥰","😍","😘","😗",
  "🤗","🤩","🤔","🤨","😐","😴","🥲","😢","😭","😤","😠","🤯","😳","🥵","🤝","🙏",
  "👍","👎","👌","✌️","🤞","💪","👏","🙌","☝️","👋","🫡","🤲","❤️","🧡","💚","💙",
  "💜","🖤","🤍","💯","🔥","✨","⭐","🎉","🎊","✅","❌","⚠️","🔒","🔐","🛡️","🕵️",
  "📎","📄","📁","📊","📷","🎙️","⏱️","⏳","📌","💡","🚀","🏆","☕","🌙","☀️","🌟",
] as const;

export function Composer({ conversationId }: { conversationId: string }) {
  const { sendMessage } = useApp();
  const [text, setText] = useState("");
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [pending, setPending] = useState<Attachment | null>(null);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);

  const send = () => {
    if (!text.trim() && !pending) return;
    sendMessage({
      conversationId,
      text: text.trim() || undefined,
      attachment: pending ?? undefined,
      policy,
    });
    setText("");
    setPending(null);
  };

  const pickFile = (file: File) => {
    const kind = guessKind(file.name);
    setPending({
      id: `att-${Date.now()}`,
      kind,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} ك.ب`,
      src: kind === "image" ? URL.createObjectURL(file) : undefined,
      pages:
        kind === "image"
          ? undefined
          : ["هذا الملف يُعرض داخل التطبيق فقط في النسخة التجريبية."],
    });
  };

  const toggleRecording = async () => {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        setPending({
          id: `voice-${Date.now()}`,
          kind: "audio",
          name: "ملاحظة صوتية",
          size: `${Math.max(1, Math.round(blob.size / 1024))} ك.ب`,
          src: URL.createObjectURL(blob),
          durationSec: Math.max(
            1,
            Math.round((Date.now() - startedAt.current) / 1000),
          ),
        });
        setRecording(false);
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
    <div className="pb-safe shrink-0 bg-background px-5 pt-3">
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
            onClick={() => setPending(null)}
            aria-label="إزالة المرفق"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 items-end gap-1 rounded-[26px] bg-surface-2 px-1.5 py-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-full text-muted-foreground"
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
            onChange={(e) => setText(e.target.value)}
            ref={inputRef}
            onKeyDown={(e) => {
              // Enter = سطر جديد. الإرسال بالزر أو ⌘/Ctrl + Enter.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={recording ? "جارٍ التسجيل…" : "اكتب رسالة محمية…"}
            className="max-h-28 min-h-9 min-w-0 flex-1 resize-none border-none bg-transparent px-1 py-2 text-base font-medium shadow-none focus-visible:ring-0"
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
            {recording ? (
              <Square className="size-[18px]" />
            ) : (
              <Mic className="size-[18px]" />
            )}
          </Button>
        )}
      </div>

    </div>
  );
}
