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
    <main className="relative min-h-dvh w-full overflow-y-auto bg-[#f4f7f5] text-slate-900">
      {/* خلفية فاتحة حديثة */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -start-32 size-[30rem] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[-10rem] end-[-8rem] size-[32rem] rounded-full bg-emerald-300/25 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.9),transparent_60%)]" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center gap-10 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:gap-16 lg:py-16">
        {/* الهوية */}
        <section className="w-full max-w-xl lg:flex-1">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white shadow-[0_12px_30px_-12px_rgba(16,60,40,0.25)] ring-1 ring-emerald-900/10 sm:size-20">
              <img
                src="/logo.png"
                alt="شعار درع"
                width={80}
                height={80}
                className="size-11 object-contain sm:size-14"
              />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">{COMPANY_NAME}</p>
              <p className="text-sm text-slate-500">درع الحماية والأمان لتواصل بلا تسريب</p>
            </div>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-900/10 shadow-sm sm:text-sm">
            <ShieldCheck className="size-4" />
            مساحة عمل خاصة وآمنة
          </div>

          <h1 className="mt-5 font-display text-[1.9rem] font-bold leading-[1.35] text-slate-900 sm:text-[2.6rem] lg:text-[3rem]">
            تواصل شركتك،
            <span className="block bg-gradient-to-l from-emerald-600 to-primary bg-clip-text text-transparent">
              محفوظ داخل درع واحد
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500 sm:text-base sm:leading-8">
            محادثات وملفات وصلاحيات دقيقة ضمن منصة ويب متكاملة تعمل على الكمبيوتر والجوال.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {highlights.map((h) => (
              <div
                key={h.label}
                className="rounded-2xl bg-white p-4 ring-1 ring-emerald-900/10 shadow-[0_10px_30px_-18px_rgba(16,60,40,0.25)] transition hover:shadow-[0_16px_36px_-18px_rgba(16,60,40,0.35)]"
              >
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-900/5">
                  <h.icon className="size-4" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{h.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* بطاقة الدخول */}
        <section className="w-full max-w-md lg:w-[26rem]">
          <div className="rounded-3xl bg-white p-6 shadow-[0_30px_80px_-40px_rgba(16,60,40,0.35)] ring-1 ring-emerald-900/10 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
              تسجيل الدخول
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              استخدم حساب العمل للوصول إلى المحادثات والملفات.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-5">
              <div className="space-y-2 text-start">
                <Label htmlFor="email" className="text-slate-700">البريد الرسمي</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${COMPANY_DOMAIN}`}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 text-base text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:bg-white"
                />
              </div>

              <div className="space-y-2 text-start">
                <Label htmlFor="password" className="text-slate-700">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 text-base text-slate-900 shadow-none focus-visible:border-primary focus-visible:bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-xl text-base font-bold shadow-[0_16px_40px_-18px_var(--primary)]"
              >
                {busy ? "جارٍ الدخول…" : "دخول آمن"}
              </Button>

              <p className="text-center text-xs leading-6 text-slate-400">
                الحسابات يُنشئها مسؤول الشركة فقط. نسيت كلمة المرور؟ تواصل مع المسؤول ليضبطها لك مباشرة.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
