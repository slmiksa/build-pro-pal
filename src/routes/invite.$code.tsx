import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/invite/$code")({
  head: () => ({
    meta: [
      { title: "قبول دعوة الانضمام · درع" },
      {
        name: "description",
        content:
          "أكمل انضمامك لمنصة المحادثات المحمية الخاصة بالشركة عبر رابط دعوة صالح لمرة واحدة.",
      },
      { property: "og:title", content: "دعوة انضمام · درع" },
      {
        property: "og:description",
        content: "رابط دعوة خاص محدود الصلاحية.",
      },
    ],
  }),
  component: InvitePage,
});

type InviteInfo = { email: string; expires_at: string } | null;

function InvitePage() {
  const { code } = useParams({ from: "/invite/$code" });
  const { signUp, signIn } = useApp();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo>(null);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .rpc("check_invite", { _code: code })
      .then(({ data }) => {
        if (!active) return;
        const row = Array.isArray(data) ? data[0] : data;
        setInvite((row as InviteInfo) ?? null);
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || busy) return;
    if (!name.trim() || password.trim().length < 8) {
      toast.error("أدخل الاسم وكلمة مرور من ٨ أحرف على الأقل");
      return;
    }
    setBusy(true);
    const res = await signUp({
      email: invite.email,
      password,
      name: name.trim(),
      title: "مدير",
    });
    if (res.error) {
      setBusy(false);
      toast.error(
        res.error.includes("already") ? "هذا البريد مسجّل مسبقاً" : "تعذّر الانضمام",
      );
      return;
    }
    if (res.needsConfirmation) {
      await supabase.rpc("consume_invite", { _code: code });
      setBusy(false);
      toast.success("أرسلنا رسالة تأكيد إلى بريدك، فعّل الحساب ثم سجّل الدخول");
      navigate({ to: "/" });
      return;
    }
    await supabase.rpc("consume_invite", { _code: code });
    await signIn(invite.email, password);
    setBusy(false);
    toast.success("تم الانضمام");
    navigate({ to: "/chat" });
  };

  const invalid = !checking && !invite;

  return (
    <div className="grid-noise flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Brand size="md" />
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          {checking ? (
            <p className="text-center text-sm text-muted-foreground">
              جارٍ التحقق من الدعوة…
            </p>
          ) : invalid ? (
            <div className="space-y-3 text-center">
              <ShieldX className="mx-auto size-9 text-destructive" />
              <h1 className="text-lg font-semibold">رابط الدعوة غير صالح</h1>
              <p className="text-xs text-muted-foreground">
                انتهت صلاحية الرابط أو تم استخدامه مسبقاً. اطلب من مسؤول النظام
                رابطاً جديداً.
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                العودة لصفحة الدخول
              </Button>
            </div>
          ) : (
            <form onSubmit={accept} className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="size-4 text-primary" /> إكمال الانضمام
              </div>
              <p className="text-xs text-muted-foreground">
                دعوة لـ <span dir="ltr">{invite?.email}</span> — صالحة حتى{" "}
                {invite ? formatDateTime(new Date(invite.expires_at).getTime()) : ""}.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="iname">الاسم الكامل</Label>
                <Input
                  id="iname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ipass">كلمة مرور جديدة</Label>
                <Input
                  id="ipass"
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                انضمام
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
