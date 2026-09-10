import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Copy, Globe, KeyRound, Link2, Power, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/format";
import { useApp } from "@/store/app";
import { UserAvatar } from "@/components/UserAvatar";

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
  const {
    users,
    invites,
    isAdmin,
    addMember,
    toggleMemberDisabled,
    createInvite,
    resetMemberPassword,
    setDirectoryFlags,
    deleteMember,
    updateMyProfile,
    currentUser,
    allowedDomains,
    setAllowedDomains,
  } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwTarget, setPwTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [pwValue, setPwValue] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [domainsInput, setDomainsInput] = useState("");
  const [domainsBusy, setDomainsBusy] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileTitle, setProfileTitle] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [delTarget, setDelTarget] = useState<{ id: string; name: string } | null>(null);
  const domainsText = allowedDomains.join("، ");

  useEffect(() => {
    setDomainsInput(allowedDomains.join(", "));
  }, [allowedDomains]);

  useEffect(() => {
    setProfileName(currentUser?.name ?? "");
    setProfileTitle(currentUser?.title ?? "");
  }, [currentUser?.name, currentUser?.title]);

  const saveProfile = async (avatar?: File) => {
    setProfileBusy(true);
    const err = await updateMyProfile({
      name: profileName,
      title: profileTitle,
      avatar,
    });
    setProfileBusy(false);
    if (err) toast.error(err);
    else toast.success("تم حفظ الملف الشخصي");
  };

  const removeMember = async () => {
    if (!delTarget) return;
    const err = await deleteMember(delTarget.id);
    if (err) toast.error(err);
    else toast.success(`تم حذف ${delTarget.name}`);
    setDelTarget(null);
  };

  const domainAllowed = (value: string) => {
    if (allowedDomains.length === 0) return true;
    const at = value.trim().toLowerCase().split("@")[1] ?? "";
    return allowedDomains.includes(at);
  };

  const saveDomains = async () => {
    setDomainsBusy(true);
    const err = await setAllowedDomains(
      domainsInput.split(/[,،\s]+/).filter(Boolean),
    );
    setDomainsBusy(false);
    if (err) toast.error("تعذّر حفظ النطاقات");
    else toast.success("تم حفظ النطاقات المسموح بها");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !email.trim()) {
      toast.error("الاسم والبريد مطلوبان");
      return;
    }
    if (memberPassword.trim().length < 8) {
      toast.error("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }
    if (!domainAllowed(email)) {
      toast.error(`يجب أن يكون البريد على أحد النطاقات: ${domainsText}`);
      return;
    }
    setBusy(true);
    const res = await addMember({
      name: name.trim(),
      email: email.trim(),
      title: title.trim() || "مدير",
      password: memberPassword,
    });
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("تمت إضافة العضو", {
      description: "يمكنه الدخول بالبريد وكلمة المرور التي حددتها، وتغييرها لاحقاً.",
      duration: 8000,
    });
    setName("");
    setEmail("");
    setTitle("");
    setMemberPassword("");
  };

  const makeInvite = async () => {
    if (!domainAllowed(inviteEmail)) {
      toast.error(`الدعوات مقيدة بالنطاقات: ${domainsText}`);
      return;
    }
    const inv = await createInvite(inviteEmail.trim());
    if (!inv) {
      toast.error("تعذّر إنشاء رابط الدعوة");
      return;
    }
    setInviteEmail("");
    toast.success("تم إنشاء رابط الدعوة", { description: inv.code });
  };


  const changeOwnPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف");
      return;
    }
    setPwBusy(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
    } as { password: string });
    setPwBusy(false);
    if (error) {
      toast.error("تعذّر تغيير كلمة المرور");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success("تم تغيير كلمة المرور");
  };

  const applyMemberPassword = async () => {
    if (!pwTarget) return;
    if (pwValue.trim().length < 8) {
      toast.error("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }
    setPwBusy(true);
    const error = await resetMemberPassword(pwTarget.id, pwValue.trim());
    setPwBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("تم تغيير كلمة المرور", {
      description: `يستطيع ${pwTarget.name} الدخول بها مباشرة.`,
    });
    setPwTarget(null);
    setPwValue("");
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
            {isAdmin
              ? "لا يوجد تسجيل ذاتي — الوصول بحساب تنشئه أنت أو برابط دعوة تنتهي صلاحيته."
              : "العرض فقط — إضافة الأعضاء والدعوات متاحة لمسؤول النظام."}
          </p>
        </div>


        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="card-soft min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
              <span className="font-display text-[15px] font-semibold">
                أعضاء الشركة
              </span>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {users.length}
              </span>
            </div>
            <ul className="divide-y divide-border/70">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3.5 px-4 py-4"
                >
                  <UserAvatar
                    name={u.name}
                    color={u.color}
                    avatarUrl={u.avatarUrl}
                    className="size-10 rounded-2xl text-[12px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">
                        {u.name}
                      </span>
                      {u.role === "admin" && (
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                          مسؤول
                        </span>
                      )}
                      {u.disabled && (
                        <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          معطّل
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-[11.5px] text-muted-foreground" dir="ltr">
                      {u.email} · {u.title}
                    </div>
                  </div>
                  <div className="col-span-2 grid min-w-0 grid-cols-3 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-w-0 rounded-2xl shadow-none"
                    disabled={!isAdmin}
                    onClick={() => {
                      setPwValue("");
                      setPwTarget({ id: u.id, name: u.name });
                    }}
                  >
                    <KeyRound className="size-3.5" />
                    <span className="truncate">كلمة المرور</span>
                  </Button>
                  <Button
                    variant={u.disabled ? "secondary" : "outline"}
                    size="sm"
                    className="min-w-0 rounded-2xl shadow-none"
                    disabled={!isAdmin}
                    onClick={() => toggleMemberDisabled(u.id)}
                  >

                    <Power className="size-3.5" />
                    {u.disabled ? "تنشيط" : "تعطيل"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-0 rounded-2xl text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
                    disabled={!isAdmin || u.id === currentUser?.id}
                    onClick={() => setDelTarget({ id: u.id, name: u.name })}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="truncate">حذف</span>
                  </Button>
                  </div>
                  <div className="col-span-2 space-y-2 rounded-2xl bg-surface-2/60 p-3">
                    <label className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="min-w-0">
                        <span className="block font-medium">يرى كل الأعضاء</span>
                        <span className="block text-[10.5px] text-muted-foreground">
                          إن أُغلق، لن يجد غيره إلا بالبحث بالبريد
                        </span>
                      </span>
                      <Switch
                        checked={u.canBrowseDirectory}
                        disabled={!isAdmin}
                        onCheckedChange={(v) =>
                          void setDirectoryFlags(u.id, { canBrowseDirectory: v })
                        }
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="min-w-0">
                        <span className="block font-medium">مخفي عن قوائم الآخرين</span>
                        <span className="block text-[10.5px] text-muted-foreground">
                          لا يظهر حسابه إلا لمن يشاركه محادثة أو يبحث ببريده
                        </span>
                      </span>
                      <Switch
                        checked={u.hiddenInDirectory}
                        disabled={!isAdmin}
                        onCheckedChange={(v) =>
                          void setDirectoryFlags(u.id, { hiddenInDirectory: v })
                        }
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            {isAdmin && (
              <>
            <div className="space-y-3 card-soft p-4">

              <div className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="size-4 text-primary" /> نطاقات البريد المسموح بها
              </div>
              <p className="text-xs text-muted-foreground">
                اكتب نطاقات شركتك مفصولة بفاصلة (مثال: company.sa, example.com).
                اتركها فارغة للسماح بأي بريد.
              </p>
              <Input
                dir="ltr"
                value={domainsInput}
                onChange={(e) => setDomainsInput(e.target.value)}
                placeholder="company.sa, example.com"
                disabled={!isAdmin}
              />
              <Button
                className="w-full"
                onClick={() => void saveDomains()}
                disabled={!isAdmin || domainsBusy}
              >
                حفظ النطاقات
              </Button>
            </div>

            <form
              onSubmit={submit}
              className="space-y-3 card-soft p-4"
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
                  placeholder={`name@${allowedDomains[0] ?? "example.com"}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p">كلمة المرور</Label>
                <Input
                  id="p"
                  dir="ltr"
                  type="text"
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                />
                <p className="text-[11px] text-muted-foreground">
                  يدخل بها العضو أول مرة، ويستطيع تغييرها بنفسه لاحقاً.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t">المسمى الوظيفي</Label>
                <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                إضافة
              </Button>
            </form>
              </>
            )}


            <div className="space-y-3 card-soft p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Camera className="size-4 text-primary" /> ملفي الشخصي
              </div>
              {currentUser && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="relative"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="تغيير الصورة الشخصية"
                  >
                    <UserAvatar
                      name={currentUser.name}
                      color={currentUser.color}
                      avatarUrl={currentUser.avatarUrl}
                      className="size-14 text-sm"
                    />
                    <span className="absolute -bottom-1 -end-1 grid size-6 place-items-center rounded-full border border-border bg-background text-primary">
                      <Camera className="size-3.5" />
                    </span>
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    اضغط على الصورة لاختيار صورة من جهازك. تظهر لأعضاء محادثاتك.
                  </p>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void saveProfile(f);
                    }}
                  />
                </div>
              )}
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="الاسم"
              />
              <Input
                value={profileTitle}
                onChange={(e) => setProfileTitle(e.target.value)}
                placeholder="المسمى الوظيفي"
              />
              <Button
                className="w-full"
                disabled={profileBusy}
                onClick={() => void saveProfile()}
              >
                حفظ الملف الشخصي
              </Button>
            </div>

            <div className="space-y-3 card-soft p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="size-4 text-primary" /> تغيير كلمة مروري
              </div>
              <Input
                dir="ltr"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="كلمة المرور الحالية"
              />
              <Input
                dir="ltr"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة المرور الجديدة"
              />
              <Button
                className="w-full"
                onClick={() => void changeOwnPassword()}
                disabled={pwBusy}
              >
                حفظ كلمة المرور
              </Button>
            </div>

            <div className="space-y-3 card-soft p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="size-4 text-primary" /> روابط الدعوة
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Input
                  className="min-w-0"
                  dir="ltr"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={`name@${allowedDomains[0] ?? "example.com"}`}
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

      <Dialog
        open={pwTarget !== null}
        onOpenChange={(o) => {
          if (!o) setPwTarget(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-right font-display">
              كلمة مرور {pwTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-right">
              تُطبّق فوراً بدون أي رابط بريد — أبلغ العضو بها.
            </DialogDescription>
          </DialogHeader>
          <Input
            dir="ltr"
            value={pwValue}
            onChange={(e) => setPwValue(e.target.value)}
            placeholder="8 أحرف على الأقل"
          />
          <Button
            className="w-full rounded-2xl"
            disabled={pwBusy}
            onClick={() => void applyMemberPassword()}
          >
            حفظ كلمة المرور
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={delTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDelTarget(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-right font-display">
              حذف {delTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-right">
              سيُحذف الحساب نهائياً ولن يستطيع الدخول مرة أخرى. تبقى الرسائل
              المرسلة داخل المحادثات كما هي.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => setDelTarget(null)}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl"
              onClick={() => void removeMember()}
            >
              حذف نهائي
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
