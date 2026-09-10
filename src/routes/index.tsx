import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Droplets, ScanEye, ShieldCheck, Timer } from "lucide-react";
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
        content: "منصة محادثات داخلية آمنة للشركات",
      },
      { property: "og:image", content: "https://shield.lamhasec.com/og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "درع للتواصل" },
      {
        name: "twitter:description",
        content: "منصة محادثات داخلية آمنة للشركات",
      },
      { name: "twitter:image", content: "https://shield.lamhasec.com/og.png" },
    ],
  }),
  component: LoginPage,
});

const highlights = [
  { icon: ScanEye, label: "إخفاء عند الالتقاط", desc: "حماية المحتوى الحساس" },
  { icon: Droplets, label: "علامة مائية", desc: "اسم المستلم على كل ملف" },
  { icon: Timer, label: "اختفاء تلقائي", desc: "رسائل تُحذف بعد المدة" },
];

function LoginPage() {
  const { signIn, currentUserId, ready } = useApp();
  const navigate = useNavigate();
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
    <main className="relative min-h-dvh w-full bg-background text-foreground">
      {/* خلفية حيوية باستخدام رموز التصميم */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -start-32 size-[30rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10rem] end-[-8rem] size-[32rem] rounded-full bg-primary/30 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.95),transparent_60%)]" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center gap-10 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:gap-16 lg:py-16">
        {/* الهوية */}
        <section className="w-full max-w-xl lg:flex-1">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-card shadow-[0_12px_30px_-12px_color-mix(in_oklab,var(--primary)_35%,transparent)] ring-1 ring-border sm:size-20">
              <img
                src="/logo.png"
                alt="شعار درع"
                width={80}
                height={80}
                className="size-11 object-contain sm:size-14"
              />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">{COMPANY_NAME}</p>
            </div>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/15 shadow-sm sm:text-sm">
            <ShieldCheck className="size-4" />
            مساحة عمل خاصة وآمنة
          </div>

          <h1 className="mt-5 font-display text-[2rem] font-extrabold leading-[1.25] text-foreground sm:text-[2.8rem] lg:text-[3.25rem]">
            تواصل شركتك
            <span className="block bg-gradient-to-l from-primary-dark to-primary bg-clip-text text-transparent">
              محفوظ داخل درع واحد
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            محادثات وملفات وصلاحيات دقيقة ضمن منصة ويب متكاملة تعمل على الكمبيوتر والجوال.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {highlights.map((h) => (
              <div
                key={h.label}
                className="rounded-2xl bg-card p-4 ring-1 ring-border shadow-[0_10px_30px_-18px_color-mix(in_oklab,var(--primary)_30%,transparent)] transition hover:shadow-[0_16px_36px_-18px_color-mix(in_oklab,var(--primary)_40%,transparent)] hover:-translate-y-0.5"
              >
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <h.icon className="size-4" />
                </div>
                <p className="mt-3 text-sm font-bold text-card-foreground">{h.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* بطاقة الدخول */}
        <section className="w-full max-w-md lg:w-[26rem]">
          <div className="rounded-3xl bg-card p-6 shadow-[0_30px_80px_-40px_color-mix(in_oklab,var(--primary)_35%,transparent)] ring-1 ring-border sm:p-8">
            <h2 className="font-display text-2xl font-bold text-card-foreground sm:text-[1.75rem]">
              تسجيل الدخول
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              استخدم حساب العمل للوصول إلى المحادثات والملفات.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-5">
              <div className="space-y-2 text-start">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground/90">البريد الرسمي</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${COMPANY_DOMAIN}`}
                  className="h-12 rounded-xl border-input bg-secondary text-base text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-card"
                />
              </div>

              <div className="space-y-2 text-start">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/90">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-input bg-secondary text-base text-foreground shadow-none focus-visible:border-primary focus-visible:bg-card"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-xl text-base font-bold shadow-[0_16px_40px_-18px_color-mix(in_oklab,var(--primary)_45%,transparent)] hover:shadow-[0_20px_48px_-18px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
              >
                {busy ? "جارٍ الدخول…" : "دخول آمن"}
              </Button>

              <p className="text-center text-xs leading-6 text-muted-foreground/80">
                الحسابات يُنشئها مسؤول الشركة فقط. نسيت كلمة المرور؟ تواصل مع المسؤول ليضبطها لك مباشرة.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
