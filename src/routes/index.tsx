import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Droplets, ScanEye, ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { COMPANY_DOMAIN, COMPANY_NAME } from "@/data/seed";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "درع · المحادثات المحمية — دخول المدراء" },
      {
        name: "description",
        content:
          "منصة محادثات داخلية للشركة: رسائل وملفات بصلاحيات يحددها المرسل، مع منع التحميل والنسخ وعلامة مائية وسجل تدقيق كامل.",
      },
      { property: "og:title", content: "درع · المحادثات المحمية" },
      {
        property: "og:description",
        content: "تواصل داخلي آمن للمدراء لا تخرج ملفاته من الشركة.",
      },
    ],
  }),
  component: LoginPage,
});

const highlights = [
  { icon: ScanEye, label: "إخفاء عند الالتقاط" },
  { icon: Droplets, label: "علامة مائية" },
  { icon: Timer, label: "اختفاء تلقائي" },
];

function LoginPage() {
  const { signIn, users } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"welcome" | "signin">("welcome");
  const [email, setEmail] = useState(`salem@${COMPANY_DOMAIN}`);
  const [password, setPassword] = useState("demo1234");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("أدخل البريد وكلمة المرور");
      return;
    }
    if (signIn(email)) {
      navigate({ to: "/chat" });
    } else {
      toast.error("هذا الحساب معطّل، راجع مسؤول النظام");
    }
  };

  return (
    <div className="app-viewport flex justify-center bg-surface-2 lg:py-8">
      <div className="flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-background lg:h-[calc(100dvh-4rem)] lg:rounded-[2.75rem] lg:shadow-[0_32px_64px_-24px_rgba(14,21,18,0.18)]">

        <div className="pt-safe flex flex-1 flex-col overflow-y-auto px-7 pb-7">
          <div className="flex flex-1 flex-col justify-center py-8">
            <div className="flex justify-center">
              <div className="grid size-24 place-items-center rounded-[28px] bg-accent">
                <img
                  src={logo}
                  alt="شعار درع"
                  width={72}
                  height={72}
                  className="size-[72px]"
                />
              </div>
            </div>
            <div className="mt-7 text-center">
              <div className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
                <ShieldCheck className="size-4" />
                مساحة عمل خاصة
              </div>
              <h1 className="font-display text-[38px] font-bold leading-tight">
                {COMPANY_NAME}
              </h1>
              <p className="mt-2 text-[15px] font-medium text-muted-foreground">
                محادثات الشركة في مكان واحد وآمن
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {highlights.map((h) => (
                <span
                  key={h.label}
                  className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-[11px] font-semibold text-accent-foreground"
                >
                  <h.icon className="size-3.5" /> {h.label}
                </span>
              ))}
            </div>
          </div>

          {mode === "welcome" ? (
            <div className="space-y-2.5">
              <Button
                className="h-14 w-full rounded-2xl text-base font-bold shadow-none"
                onClick={() => setMode("signin")}
              >
                تسجيل الدخول
              </Button>
              <Button
                variant="secondary"
                className="h-14 w-full rounded-2xl text-base font-bold shadow-none"
                onClick={() => {
                  signIn(`salem@${COMPANY_DOMAIN}`);
                  navigate({ to: "/chat" });
                }}
              >
                تجربة سريعة كمدير
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 rounded-3xl bg-surface-2 p-5">
              <div className="space-y-1.5 text-start">
                <Label htmlFor="email">البريد الرسمي</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${COMPANY_DOMAIN}`}
                  className="h-13 rounded-2xl border-border bg-surface shadow-none"
                />
              </div>
              <div className="space-y-1.5 text-start">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-13 rounded-2xl border-border bg-surface shadow-none"
                />
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-2xl text-base font-semibold"
              >
                دخول آمن
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-foreground">
                  نسخة تجريبية بدون قاعدة بيانات — اختر حساباً:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {users
                    .filter((u) => !u.disabled)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setEmail(u.email)}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors active:border-primary active:text-primary"
                      >
                        {u.name}
                      </button>
                    ))}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("welcome")}
                className="w-full text-center text-sm text-muted-foreground"
              >
                <ArrowRight className="size-4" /> رجوع
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
