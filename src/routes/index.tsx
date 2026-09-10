import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Droplets, ScanEye, ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      { property: "og:title", content: "درع للتواصل" },
      {
        property: "og:description",
        content: "درع الحماية والأمان لتواصل بلا تسريب",
      },
      { property: "og:image", content: "https://shield.lamhasec.com/og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "درع للتواصل" },
      {
        name: "twitter:description",
        content: "درع الحماية والأمان لتواصل بلا تسريب",
      },
      { name: "twitter:image", content: "https://shield.lamhasec.com/og.png" },
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
  const { signIn, currentUserId, ready } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"welcome" | "signin">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && currentUserId) navigate({ to: "/chat" });
  }, [ready, currentUserId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!email.trim() || !password.trim()) {
      toast.error("أدخل البريد وكلمة المرور");
      return;
    }

    setBusy(true);
    const error = await signIn(email.trim(), password);
    setBusy(false);
    if (error) { toast.error(error); return; }
    navigate({ to: "/chat" });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <section className="flex min-h-[46vh] flex-col justify-between bg-surface-2 px-6 py-8 sm:px-10 lg:min-h-screen lg:px-16 lg:py-12">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-accent">
              <img src="/logo.png" alt="شعار درع" width={38} height={38} className="size-9" />
            </div>
            <span className="font-display text-xl font-bold">{COMPANY_NAME}</span>
          </div>

          <div className="my-10 max-w-2xl lg:my-16">
            <div className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="size-5" />
              مساحة عمل خاصة وآمنة
            </div>
            <h1 className="font-display text-4xl leading-[1.35] font-bold sm:text-5xl lg:text-6xl">
              تواصل شركتك، محفوظ داخل درع واحد
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              محادثات وملفات وصلاحيات دقيقة ضمن منصة ويب متكاملة تعمل على الكمبيوتر والجوال.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map((h) => (
                <div key={h.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-4">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                    <h.icon className="size-4" />
                  </div>
                  <span className="text-sm font-semibold text-accent-foreground">{h.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">درع الحماية والأمان لتواصل بلا تسريب</p>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-5 grid size-20 place-items-center rounded-2xl bg-accent lg:hidden">
                <img
                  src="/logo.png"
                  alt="شعار درع"
                  width={58}
                  height={58}
                  className="size-14"
                />
              </div>
              <h2 className="font-display text-3xl font-bold">
                {mode === "welcome" ? "مرحبًا بك" : "تسجيل الدخول"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                استخدم حساب العمل للوصول إلى المحادثات والملفات.
              </p>
            </div>

          {mode === "welcome" ? (
            <div className="space-y-3">
              <Button
                className="h-12 w-full rounded-lg text-base font-bold shadow-none"
                onClick={() => setMode("signin")}
              >
                تسجيل الدخول
              </Button>
              <p className="pt-2 text-center text-xs text-muted-foreground">
                الحسابات يُنشئها مسؤول الشركة فقط.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-1.5 text-start">
                <Label htmlFor="email">البريد الرسمي</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${COMPANY_DOMAIN}`}
                  className="h-12 rounded-lg border-border bg-surface shadow-none"
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
                  className="h-12 rounded-lg border-border bg-surface shadow-none"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-lg text-base font-semibold"
              >
                دخول آمن
              </Button>

              <p className="w-full text-center text-xs text-muted-foreground">
                نسيت كلمة المرور؟ تواصل مع مسؤول الشركة ليضبطها لك مباشرة.
              </p>

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
        </section>
      </div>
    </main>
  );
}
