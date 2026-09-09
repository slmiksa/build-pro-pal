import { useEffect, useState } from "react";
import {
  Ban,
  Check,
  Forward,
  CheckCheck,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Mic,
  MoreHorizontal,
  Play,
  Timer,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PolicyBadges } from "@/components/PolicyBadges";
import { countdown, formatTime, initials } from "@/lib/format";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app";

const kindIcon = {
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  image: ImageIcon,
  audio: Mic,
} as const;

export function MessageItem({
  message,
  showSender,
  onOpen,
  onForward,
}: {
  message: Message;
  showSender: boolean;
  onOpen: (m: Message) => void;
  onForward?: ((m: Message) => void) | undefined;
}) {
  const { currentUserId, userById, revokeMessage, log } = useApp();
  const mine = message.senderId === currentUserId;
  const sender = userById(message.senderId);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!message.expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [message.expiresAt]);

  const guardCopy = (e: React.ClipboardEvent) => {
    if (message.policy.allowCopy) return;
    e.preventDefault();
    log("copy_blocked", "محاولة نسخ نص محمي", {
      actorId: currentUserId ?? undefined,
      messageId: message.id,
      conversationId: message.conversationId,
    });
    toast.error("النسخ ممنوع في هذه الرسالة");
  };

  if (message.revoked) {
    return (
      <div className={cn("flex", mine ? "justify-start" : "justify-end")}>
        <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-1.5 text-[11px] text-muted-foreground">
          <Ban className="size-3.5" /> تم سحب هذه الرسالة
        </div>
      </div>
    );
  }

  const Icon = message.attachment ? kindIcon[message.attachment.kind] : null;
  const msLeft = message.expiresAt ? message.expiresAt - now : 0;

  return (
    <div
      className={cn(
        "flex flex-col",
        mine ? "items-end" : "items-start",
      )}
    >
      {showSender && !mine && (
        <div className="mb-1.5 flex items-center gap-2 ps-1">
          <span
            className="flex size-6 items-center justify-center rounded-full text-[9px] font-bold text-primary-foreground"
            style={{ backgroundColor: sender?.color }}
          >
            {initials(sender?.name ?? "؟")}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {sender?.name}
          </span>
        </div>
      )}

      <div className="max-w-[min(560px,85%)]">
        <div
          onCopy={guardCopy}
          className={cn(
            "relative px-4 py-3 text-[15px] leading-7",
            !message.policy.allowCopy && "no-leak",
            mine
              ? "rounded-2xl rounded-tl-md bg-bubble-out text-bubble-out-foreground shadow-[0_8px_20px_-10px_rgba(18,185,129,0.55)]"
              : "rounded-2xl rounded-tr-md bg-bubble-in text-bubble-in-foreground",
          )}
        >
          {message.forwardedFrom && (
            <span className="mb-1 flex items-center gap-1 text-[10px] opacity-70">
              <Forward className="size-3" /> رسالة معاد توجيهها
            </span>
          )}
          {message.text && (
            <p className="whitespace-pre-wrap font-medium">
              {message.text.split(/(@[^\s@]+(?:\s[^\s@]+)?)/g).map((part, i) =>
                part.startsWith("@") && message.mentions.length > 0 ? (
                  <span
                    key={i}
                    className={cn(
                      "rounded px-1 font-semibold",
                      mine ? "bg-white/20" : "bg-primary/10 text-primary",
                    )}
                  >
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </p>
          )}

          {message.attachment && Icon && (
            <button
              type="button"
              onClick={() => onOpen(message)}
              className={cn(
                "mt-2 flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition-transform active:scale-[0.99]",
                mine ? "bg-black/10" : "bg-background",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  mine
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-accent text-primary",
                )}
              >
                {message.attachment.kind === "audio" ? (
                  <Play className="size-4" />
                ) : (
                  <Icon className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {message.attachment.name}
                </span>
                <span className="block text-[11px] opacity-70">
                  {message.attachment.durationSec
                    ? `${message.attachment.durationSec} ثانية · تشغيل داخل التطبيق`
                    : `${message.attachment.size} · عرض داخل التطبيق`}
                  {message.policy.maxOpens > 0 &&
                    ` · ${message.opens}/${message.policy.maxOpens} فتح`}
                </span>
              </span>
            </button>
          )}

          <div
            className={cn(
              "mt-2 flex items-center gap-2",
              mine ? "justify-end" : "justify-start",
            )}
          >
            <PolicyBadges
              policy={message.policy}
              compact
              onPrimary={mine}
              className={cn(
                "gap-1 rounded-full px-2 py-0.5",
                mine ? "bg-black/10" : "bg-background",
              )}
            />
            {message.expiresAt && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] font-semibold",
                  mine ? "text-primary-foreground/80" : "text-warning",
                )}
              >
                <Timer className="size-3" /> {countdown(msLeft)}
              </span>
            )}
            <span
              className={cn(
                "text-[10px] font-medium",
                mine ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {formatTime(message.createdAt)}
            </span>
            {mine &&
              (message.readBy.length > 1 ? (
                <CheckCheck className="size-3.5 text-primary-foreground/80" />
              ) : (
                <Check className="size-3.5 text-primary-foreground/80" />
              ))}
          </div>
        </div>

        {(mine || (message.policy.allowForward && onForward)) && (
          <div
            className={cn(
              "mt-1 flex",
              mine ? "justify-end" : "justify-start",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="خيارات الرسالة"
                  className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-opacity active:opacity-60"
                >
                  <MoreHorizontal className="size-3.5" /> خيارات
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={mine ? "end" : "start"} className="min-w-44">
                {message.policy.allowForward && onForward && (
                  <DropdownMenuItem onSelect={() => onForward(message)}>
                    <Forward className="size-4" /> إعادة توجيه
                  </DropdownMenuItem>
                )}
                {message.attachment && (
                  <DropdownMenuItem onSelect={() => onOpen(message)}>
                    <ImageIcon className="size-4" /> فتح المرفق
                  </DropdownMenuItem>
                )}
                {mine && (
                  <DropdownMenuItem
                    onSelect={() => revokeMessage(message.id)}
                  >
                    <Trash2 className="size-4" /> سحب للجميع
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
