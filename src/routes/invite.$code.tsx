import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
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

function InvitePage() {
  const { code } = useParams({ from: "/invite/$code" });
  const { findInvite, consumeInvite, addMember, signIn } = useApp();
  const navigate = useNavigate();
  const invite = findInvite(code);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const invalid = !invite || invite.used || invite.expiresAt < Date.now();

  const accept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (!name.trim() || password.trim().length < 8) {
      toast.error("أدخل الاسم وكلمة مرور من ٨ أحرف على الأقل");
      return;
    }
    addMember({ name: name.trim(), email: invite.email, title: "مدير" });
    consumeInvite(invite.code);
    signIn(invite.email);
    toast.success("تم الانضمام");
    navigate({ to: "/chat" });
  };

  return (
    <div className="grid-noise flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Brand size="md" />
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          {invalid ? (
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
                دعوة لـ <span dir="ltr">{invite.email}</span> — صالحة حتى{" "}
                {formatDateTime(invite.expiresAt)}.
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
              <Button type="submit" className="w-full">
                انضمام
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
