import { useEffect, useState } from "react";
import {
  Chrome,
  Download,
  Plus,
  Share,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import { NotificationsCard } from "@/components/NotificationsPrompt";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import logoAsset from "@/assets/logo.png.asset.json";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInstalled() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
        {n}
      </span>
      <span className="pt-0.5 text-[13px] leading-relaxed text-foreground">
        {children}
      </span>
    </li>
  );
}

export function InstallAppContent() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(isInstalled());
  const ios = isIos();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-primary/10 p-4 text-center text-[13px] font-semibold text-primary">
          التطبيق مثبّت على جهازك بالفعل
        </div>
        <NotificationsCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deferred && !ios ? (
        <Button
          className="h-12 w-full rounded-2xl text-sm font-bold"
          onClick={async () => {
            await deferred.prompt();
            const { outcome } = await deferred.userChoice;
            if (outcome === "accepted") setDeferred(null);
          }}
        >
          <Download className="size-4" /> تثبيت التطبيق الآن
        </Button>
      ) : null}

      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="mb-3 flex items-center gap-2 font-bold text-[13px]">
          <Chrome className="size-4 text-primary" /> أندرويد (متصفح Chrome)
        </div>
        <ol className="space-y-2.5">
          <Step n={1}>
            افتح الموقع في متصفح <b>Chrome</b>.
          </Step>
          <Step n={2}>
            اضغط قائمة النقاط <b>⋮</b> أعلى المتصفح.
          </Step>
          <Step n={3}>
            اختر <b>«إضافة إلى الشاشة الرئيسية»</b> أو <b>«تثبيت التطبيق»</b>{" "}
            <SquarePlus className="inline size-3.5 align-middle" />.
          </Step>
          <Step n={4}>اضغط «تثبيت» وستظهر الأيقونة على شاشتك.</Step>
        </ol>
      </div>

      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="mb-3 flex items-center gap-2 font-bold text-[13px]">
          <Smartphone className="size-4 text-primary" /> آيفون (متصفح Safari)
        </div>
        <ol className="space-y-2.5">
          <Step n={1}>
            افتح الموقع في متصفح <b>Safari</b>.
          </Step>
          <Step n={2}>
            اضغط زر المشاركة{" "}
            <Share className="inline size-3.5 align-middle text-primary" /> أسفل
            الشاشة.
          </Step>
          <Step n={3}>
            مرّر للأسفل واختر <b>«إضافة إلى الشاشة الرئيسية»</b>{" "}
            <Plus className="inline size-3.5 align-middle" />.
          </Step>
          <Step n={4}>اضغط «إضافة» وستظهر الأيقونة على شاشتك.</Step>
        </ol>
      </div>

      <NotificationsCard />

      <p className="text-center text-[11px] text-muted-foreground">
        بعد التثبيت يفتح التطبيق بملء الشاشة مثل أي تطبيق على جهازك.
      </p>
    </div>
  );
}

export function InstallAppDialog({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader className="items-center text-center">
          <img src={logoAsset.url} alt="شعار درع" className="size-14 rounded-2xl" />
          <DialogTitle className="font-display text-lg">
            تثبيت تطبيق درع
          </DialogTitle>
          <DialogDescription>
            ثبّت التطبيق على جوالك مجاناً — بدون متجر وبدون مساحة كبيرة.
          </DialogDescription>
        </DialogHeader>
        <InstallAppContent />
      </DialogContent>
    </Dialog>
  );
}
