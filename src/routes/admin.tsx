import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, KeyRound, Link2, Power, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMPANY_DOMAIN } from "@/data/seed";
import { formatDateTime, initials } from "@/lib/format";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "إدارة الأعضاء والدعوات · درع" },
      {
        name: "description",
        content:
          "إضافة مدراء الشركة، تعطيل الحسابات، إعادة تعيين كلمات المرور، وإنشاء روابط دعوة محدودة الصلاحية.",
      },
      { property: "og:title", content: "إدارة الأعضاء · درع" },
      {
        property: "og:description",
        content: "تحكم كامل في من يدخل المنصة ومن يُمنع.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { users, invites, addMember, toggleMemberDisabled, createInvite } =
    useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("الاسم والبريد مطلوبان");
      return;
    }
    if (!email.trim().endsWith(`@${COMPANY_DOMAIN}`)) {
      toast.error(`يجب أن يكون البريد على نطاق @${COMPANY_DOMAIN}`);
      return;
    }
    addMember({ name: name.trim(), email: email.trim(), title: title.trim() || "مدير" });
    toast.success("تمت إضافة العضو");
    setName("");
    setEmail("");
    setTitle("");
  };

  const makeInvite = () => {
    if (!inviteEmail.trim().endsWith(`@${COMPANY_DOMAIN}`)) {
      toast.error(`الدعوات مقيدة بنطاق @${COMPANY_DOMAIN}`);
      return;
    }
    const inv = createInvite(inviteEmail.trim());
    setInviteEmail("");
    toast.success("تم إنشاء رابط الدعوة", { description: inv.code });
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    void navigator.clipboard?.writeText(url);
    toast.success("تم نسخ رابط الدعوة");
  };

  return (
    <AppShell title="الأعضاء والدعوات" subtitle="إدارة حسابات المدراء">
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            لا يوجد تسجيل ذاتي — الوصول بحساب تنشئه أنت أو برابط دعوة تنتهي
            صلاحيته.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              أعضاء الشركة ({users.length})
            </div>
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-3.5"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-background"
                    style={{ backgroundColor: u.color }}
                  >
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {u.name}
                      </span>
                      {u.role === "admin" && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                          مسؤول
                        </span>
                      )}
                      {u.disabled && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
                          معطّل
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground" dir="ltr">
                      {u.email} · {u.title}
                    </div>
                  </div>
                  <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-w-0 rounded-xl shadow-none"
                    onClick={() => toast.success("أُرسل رابط إعادة تعيين كلمة المرور")}
                  >
                    <KeyRound className="size-3.5" />
                    <span className="truncate">كلمة المرور</span>
                  </Button>
                  <Button
                    variant={u.disabled ? "secondary" : "outline"}
                    size="sm"
                    className="min-w-0 rounded-xl shadow-none"
                    onClick={() => toggleMemberDisabled(u.id)}
                  >
                    <Power className="size-3.5" />
                    {u.disabled ? "تنشيط" : "تعطيل"}
                  </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <form
              onSubmit={submit}
              className="space-y-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="size-4 text-primary" /> إضافة عضو
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="n">الاسم</Label>
                <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e">البريد</Label>
                <Input
                  id="e"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@${COMPANY_DOMAIN}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t">المسمى الوظيفي</Label>
                <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                إضافة
              </Button>
            </form>

            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="size-4 text-primary" /> روابط الدعوة
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Input
                  className="min-w-0"
                  dir="ltr"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={`name@${COMPANY_DOMAIN}`}
                />
                <Button onClick={makeInvite}>إنشاء</Button>
              </div>
              <ul className="space-y-2">
                {invites.map((i) => {
                  const expired = i.expiresAt < Date.now();
                  return (
                    <li
                      key={i.id}
                      className="rounded-xl border border-border bg-surface-2/50 p-2.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono" dir="ltr">
                          {i.code}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          aria-label="نسخ"
                          onClick={() => copyLink(i.code)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                      <div className="mt-1 text-muted-foreground" dir="ltr">
                        {i.email}
                      </div>
                      <div className="mt-1">
                        {i.used ? (
                          <span className="text-muted-foreground">مستخدم</span>
                        ) : expired ? (
                          <span className="text-destructive">منتهي</span>
                        ) : (
                          <span className="text-primary">
                            صالح حتى {formatDateTime(i.expiresAt)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
