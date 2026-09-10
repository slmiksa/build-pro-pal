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
    <main className="min-h-dvh w-full overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col lg:flex-row">
        {/* Brand panel */}
        <section className="flex flex-col justify-center gap-8 bg-surface-2 px-5 py-10 sm:px-10 lg:w-[55%] lg:px-14 lg:py-16">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent sm:size-20">
              <img
                src="/logo.png"
                alt="شعار درع"
                width={72}
                height={72}
                className="size-12 object-contain sm:size-14"
              />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                {COMPANY_NAME}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                درع الحماية والأمان لتواصل بلا تسريب
              </p>
            </div>
          </div>

          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-primary sm:text-sm">
              <ShieldCheck className="size-4" />
              مساحة عمل خاصة وآمنة
            </div>
            <h1 className="font-display text-[1.75rem] font-bold leading-[1.4] sm:text-4xl lg:text-[2.75rem]">
              تواصل شركتك، محفوظ داخل درع واحد
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              محادثات وملفات وصلاحيات دقيقة ضمن منصة ويب متكاملة تعمل على الكمبيوتر والجوال.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {highlights.map((h) => (
              <div
                key={h.label}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <h.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-accent-foreground">{h.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sign-in panel */}
        <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-sm">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">تسجيل الدخول</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              استخدم حساب العمل للوصول إلى المحادثات والملفات.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-5">
              <div className="space-y-2 text-start">
                <Label htmlFor="email">البريد الرسمي</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${COMPANY_DOMAIN}`}
                  className="h-12 rounded-xl border-border bg-surface text-base shadow-none"
                />
              </div>

              <div className="space-y-2 text-start">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-border bg-surface text-base shadow-none"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-xl text-base font-bold"
              >
                {busy ? "جارٍ الدخول…" : "دخول آمن"}
              </Button>

              <p className="text-center text-xs leading-6 text-muted-foreground">
                الحسابات يُنشئها مسؤول الشركة فقط. نسيت كلمة المرور؟ تواصل مع المسؤول ليضبطها لك مباشرة.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

