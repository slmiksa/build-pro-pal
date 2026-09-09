import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور · درع" },
      {
        name: "description",
        content: "اختر كلمة مرور جديدة لحسابك في منصة المحادثات المحمية.",
      },
      { property: "og:title", content: "إعادة تعيين كلمة المرور · درع" },
      {
        property: "og:description",
        content: "صفحة آمنة لتحديث كلمة مرور حساب الشركة.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("كلمة المرور يجب ألا تقل عن 8 أحرف"); return; }
    if (password !== confirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error("انتهت صلاحية الرابط، اطلب رابطاً جديداً"); return; }
    toast.success("تم تحديث كلمة المرور");
    navigate({ to: "/chat" });
  };

  return (
    <div className="grid-noise flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Brand size="md" />
        <form
          onSubmit={submit}
          className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-6"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="size-4 text-primary" /> كلمة مرور جديدة
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p1">كلمة المرور</Label>
            <Input
              id="p1"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p2">تأكيد كلمة المرور</Label>
            <Input
              id="p2"
              type="password"
              dir="ltr"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            حفظ
          </Button>
        </form>
      </div>
    </div>
  );
}
