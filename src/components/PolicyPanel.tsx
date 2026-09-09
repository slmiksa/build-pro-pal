import { ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Policy } from "@/lib/types";

const rows: { key: keyof Policy; label: string; hint: string }[] = [
  {
    key: "allowDownload",
    label: "السماح بالتحميل",
    hint: "إذا أُغلق، يُعرض الملف داخل التطبيق فقط",
  },
  {
    key: "allowCopy",
    label: "السماح بالنسخ وإعادة التوجيه",
    hint: "يشمل نسخ النص وسحب الصور",
  },
  {
    key: "blockScreenshot",
    label: "إخفاء عند محاولة التقاط الشاشة",
    hint: "تعتيم فوري + تحذير + تسجيل المحاولة",
  },
  {
    key: "watermark",
    label: "علامة مائية باسم المستلم",
    hint: "تجعل أي تسريب قابلاً للتتبع",
  },
];

export function PolicyPanel({
  policy,
  onChange,
}: {
  policy: Policy;
  onChange: (p: Policy) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" />
        صلاحيات هذه الرسالة
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm">{r.label}</Label>
              <p className="text-[11px] text-muted-foreground">{r.hint}</p>
            </div>
            <Switch
              checked={Boolean(policy[r.key])}
              onCheckedChange={(v) => onChange({ ...policy, [r.key]: v })}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div className="space-y-1.5">
          <Label className="text-xs">تختفي بعد</Label>
          <Select
            value={String(policy.expiresInMin)}
            onValueChange={(v) =>
              onChange({ ...policy, expiresInMin: Number(v) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">لا تختفي</SelectItem>
              <SelectItem value="5">٥ دقائق</SelectItem>
              <SelectItem value="60">ساعة</SelectItem>
              <SelectItem value="1440">يوم</SelectItem>
              <SelectItem value="10080">أسبوع</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">مرات الفتح</Label>
          <Select
            value={String(policy.maxOpens)}
            onValueChange={(v) => onChange({ ...policy, maxOpens: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">غير محدود</SelectItem>
              <SelectItem value="1">مرة واحدة</SelectItem>
              <SelectItem value="3">٣ مرات</SelectItem>
              <SelectItem value="5">٥ مرات</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
