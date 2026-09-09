import { useEffect, useState } from "react";
import { AlertTriangle, EyeOff, FileWarning, Loader2, Lock, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Watermark } from "@/components/Watermark";
import { PolicyBadges } from "@/components/PolicyBadges";
import { useScreenGuard } from "@/hooks/use-screen-guard";
import { useApp } from "@/store/app";
import type { Message } from "@/lib/types";

export function ProtectedViewer({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  const { currentUser, log, fetchAttachment } = useApp();
  const [attempts, setAttempts] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textBody, setTextBody] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const att = message.attachment;
  const policy = message.policy;

  const { masked, reveal } = useScreenGuard({
    enabled: policy.blockScreenshot,
    onAttempt: (reason) => {
      setAttempts((n) => n + 1);
      log("screenshot_attempt", `${reason} أثناء عرض «${att?.name ?? "مرفق"}»`, {
        actorId: currentUser?.id,
        messageId: message.id,
        conversationId: message.conversationId,
      });
      toast.warning("تم إخفاء المحتوى", {
        description: "سُجلت المحاولة وأُبلغ المرسل.",
      });
    },
  });

  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (policy.allowCopy) return;
      e.preventDefault();
      log("copy_blocked", `محاولة نسخ محتوى «${att?.name ?? "مرفق"}»`, {
        actorId: currentUser?.id,
        messageId: message.id,
      });
      toast.error("النسخ ممنوع في هذا الملف");
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [policy.allowCopy, att?.name, log, currentUser?.id, message.id]);

  if (!att) return null;

  const tryDownload = () => {
    if (policy.allowDownload) {
      toast.success("بدأ التحميل (تجريبي)");
      return;
    }
    log("download_blocked", `محاولة تحميل مرفوضة لـ «${att.name}»`, {
      actorId: currentUser?.id,
      messageId: message.id,
    });
    toast.error("التحميل غير مسموح", {
      description: "حدد المرسل عرض الملف داخل التطبيق فقط.",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="size-4 text-primary" />
            <span className="truncate">{att.name}</span>
          </div>
          <PolicyBadges policy={policy} className="mt-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={tryDownload}>
            تحميل
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <X className="size-4" />
          </Button>
        </div>
      </header>

      {attempts > 0 && (
        <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning">
          <ShieldAlert className="size-4" />
          سُجلت {attempts} محاولة التقاط شاشة على هذا الملف وأُبلغ المرسل.
        </div>
      )}

      <div className="relative flex-1 overflow-auto no-leak">
        {policy.watermark && (
          <Watermark label={`${currentUser?.name ?? ""} · ${currentUser?.email ?? ""}`} />
        )}

        <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
          {att.src ? (
            <img
              src={att.src}
              alt={att.name}
              draggable={false}
              className="w-full rounded-xl border border-border"
            />
          ) : (
            (att.pages ?? ["لا يوجد محتوى للعرض."]).map((p, i) => (
              <article
                key={i}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="mb-3 text-[11px] text-muted-foreground">
                  صفحة {i + 1} من {(att.pages ?? []).length || 1}
                </div>
                <p className="text-[15px] leading-8">{p}</p>
              </article>
            ))
          )}
        </div>

        {masked && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-black text-white">
            <EyeOff className="size-10 text-white/70" />
            <div className="px-10 text-center">
              <p className="font-display text-lg font-semibold">
                شاشة معتمة — ملف محمي
              </p>
              <p className="mt-1.5 max-w-xs text-xs leading-6 text-white/60">
                هذا الملف محمي ضد الالتقاط ولا يمكن تحميله. اضغط للعرض مرة أخرى
                — كل محاولة تُسجَّل باسمك.
              </p>
            </div>
            <Button onClick={reveal} size="sm" className="rounded-full px-6 text-white">
              <AlertTriangle className="size-4" /> عرض مرة أخرى
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
