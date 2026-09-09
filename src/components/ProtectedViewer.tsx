import { useEffect, useState } from "react";
import { FileWarning, Loader2, Lock, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Watermark } from "@/components/Watermark";
import { DocumentRender } from "@/components/DocumentRender";
import { PolicyBadges } from "@/components/PolicyBadges";
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

  const path = att?.path;
  const src = att?.src;

  // Load the real file bytes from private storage, once per attachment.
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setState("loading");
    setBlob(null);
    setObjectUrl(null);
    setTextBody(null);

    const load = async () => {
      let data: Blob | null = null;
      if (path) {
        data = await fetchAttachment(path);
      } else if (src) {
        try {
          const res = await fetch(src);
          if (res.ok) data = await res.blob();
        } catch {
          data = null;
        }
      }
      if (cancelled) return;
      if (!data) {
        setState("error");
        return;
      }
      url = URL.createObjectURL(data);
      setBlob(data);
      setObjectUrl(url);
      const type = data.type || "";
      if (type.startsWith("text/") || type.includes("json")) {
        const body = await data.text();
        if (!cancelled) setTextBody(body);
      }
      if (!cancelled) setState("ready");
    };

    if (path || src) void load();
    else setState("error");

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, src, fetchAttachment]);

  if (!att) return null;

  const type = blob?.type || att.mime || "";
  const isImage = att.kind === "image" || type.startsWith("image/");
  const isPdf = att.kind === "pdf" || type === "application/pdf";
  const isAudio = att.kind === "audio" || type.startsWith("audio/");
  const isVideo = type.startsWith("video/");
  const lowerName = att.name.toLowerCase();
  const isSheet =
    /\.(xlsx|xlsm|xls|csv)$/.test(lowerName) ||
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "text/csv";
  const isWord =
    /\.(docx)$/.test(lowerName) ||
    type.includes("wordprocessingml") ||
    type === "application/msword";

  const tryDownload = async () => {
    if (!policy.allowDownload) {
      await log("download_blocked", `محاولة تحميل مرفوضة لـ «${att.name}»`, {
        actorId: currentUser?.id,
        messageId: message.id,
      });
      toast.error("التحميل غير مسموح", {
        description: "حدد المرسل عرض الملف داخل التطبيق فقط.",
      });
      return;
    }
    let url = objectUrl;
    if (!url && path) {
      const data = await fetchAttachment(path);
      if (data) url = URL.createObjectURL(data);
    }
    if (!url) {
      toast.error("تعذّر تحميل الملف");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("تم حفظ الملف");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      {policy.watermark && (
        <Watermark label={`${currentUser?.name ?? ""} · ${currentUser?.email ?? ""}`} />
      )}
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

      <div
        className={`relative flex-1 overflow-auto ${policy.allowCopy ? "select-text" : "no-leak"}`}
      >
        <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">جارٍ فتح الملف…</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
              <FileWarning className="size-7 text-warning" />
              <p className="text-sm font-semibold">تعذّر فتح الملف</p>
              <p className="max-w-xs text-xs leading-6 text-muted-foreground">
                قد يكون الملف حُذف أو انتهت صلاحية الرسالة. اطلب من المرسل
                إعادة إرساله.
              </p>
            </div>
          )}

          {state === "ready" && objectUrl && (
            <>
              {isImage && (
                <img
                  src={objectUrl}
                  alt={att.name}
                  draggable={false}
                  className="w-full rounded-xl border border-border"
                />
              )}
              {isPdf && (
                <object
                  data={objectUrl}
                  type="application/pdf"
                  className="h-[75vh] w-full rounded-xl border border-border"
                >
                  <p className="p-6 text-sm text-muted-foreground">
                    متصفحك لا يدعم عرض ملفات PDF داخل الصفحة.
                  </p>
                </object>
              )}
              {isAudio && (
                <audio
                  src={objectUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full"
                />
              )}
              {isVideo && (
                <video
                  src={objectUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full rounded-xl border border-border"
                />
              )}
              {blob && (isSheet || isWord) && (
                <DocumentRender
                  blob={blob}
                  kind={isSheet ? "spreadsheet" : "word"}
                />
              )}
              {textBody !== null && !isSheet && !isWord && (
                <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                  <pre className="whitespace-pre-wrap text-[14px] leading-7">
                    {textBody}
                  </pre>
                </article>
              )}
              {!isImage &&
                !isPdf &&
                !isAudio &&
                !isVideo &&
                !isSheet &&
                !isWord &&
                textBody === null && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
                  <FileWarning className="size-7 text-primary" />
                  <p className="text-sm font-semibold">
                    هذا النوع من الملفات لا يُعرض داخل التطبيق
                  </p>
                  <p className="max-w-sm text-xs leading-6 text-muted-foreground">
                    {att.name} · {att.size}
                    <br />
                    {policy.allowDownload
                      ? "يمكنك حفظه على جهازك من زر التحميل بالأعلى."
                      : "منع المرسل تحميله، لذلك لا يمكن فتحه خارج التطبيق."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
