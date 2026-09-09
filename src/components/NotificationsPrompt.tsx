import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  notifyPermission,
  requestNotifyPermission,
  type NotifyPermission,
} from "@/lib/notifications";

const DISMISS_KEY = "dir3-notify-dismissed";

/** Shared enable button, used in the banner and in the install dialog. */
export function EnableNotificationsButton({
  className,
  onDone,
}: {
  className?: string;
  onDone?: (p: NotifyPermission) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        const res = await requestNotifyPermission();
        setBusy(false);
        onDone?.(res);
        if (res === "granted") toast.success("تم تفعيل إشعارات الرسائل");
        else if (res === "denied")
          toast.error("الإشعارات محظورة — فعّلها من إعدادات المتصفح للموقع");
        else if (res === "unsupported")
          toast.error("متصفحك لا يدعم الإشعارات — ثبّت التطبيق على الشاشة الرئيسية أولاً");
      }}
    >
      <BellRing className="size-4" /> تفعيل الإشعارات
    </Button>
  );
}

export function NotificationsCard() {
  const [perm, setPerm] = useState<NotifyPermission>("default");
  useEffect(() => setPerm(notifyPermission()), []);

  if (perm === "granted") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 p-3 text-[12.5px] font-semibold text-primary">
        <Bell className="size-4" /> إشعارات الرسائل مفعّلة
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-bold">
        <Bell className="size-4 text-primary" /> إشعارات الرسائل
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {perm === "denied"
          ? "الإشعارات محظورة لهذا الموقع. افتح إعدادات المتصفح واسمح بالإشعارات ثم أعد المحاولة."
          : "اسمح بالإشعارات ليصلك تنبيه عند وصول رسالة جديدة. لا يظهر نص الرسالة في التنبيه — فقط اسم المُرسِل."}
      </p>
      {perm === "denied" ? (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
          <BellOff className="size-3.5" /> بحاجة لتغيير الإذن من المتصفح
        </div>
      ) : (
        <EnableNotificationsButton
          className="h-11 w-full rounded-xl text-[13px] font-bold"
          onDone={setPerm}
        />
      )}
    </div>
  );
}

/** Slim banner shown inside the app until the user answers the prompt. */
export function NotificationsBanner() {
  const [perm, setPerm] = useState<NotifyPermission>("granted");
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const p = notifyPermission();
    setPerm(p);
    setHidden(p !== "default" || localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (hidden || perm !== "default") return null;

  return (
    <div className="mx-5 mb-2 flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2">
      <Bell className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-[12px] leading-tight font-medium">
        فعّل الإشعارات ليصلك تنبيه بالرسائل الجديدة
      </p>
      <EnableNotificationsButton
        className="h-8 shrink-0 rounded-full px-3 text-[11.5px] font-bold"
        onDone={(p) => {
          setPerm(p);
          if (p !== "default") setHidden(true);
        }}
      />
      <button
        type="button"
        aria-label="إخفاء"
        className="shrink-0 text-muted-foreground"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setHidden(true);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
