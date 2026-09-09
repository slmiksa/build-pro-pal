import {
  Copy,
  CopySlash,
  Download,
  DownloadCloud,
  Droplets,
  Eye,
  Forward,
  Share2,
  Timer,
} from "lucide-react";
import type { Policy } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = { icon: typeof Copy; label: string; danger?: boolean };

export function policyItems(policy: Policy): Item[] {
  const items: Item[] = [];
  items.push(
    policy.allowDownload
      ? { icon: DownloadCloud, label: "التحميل مسموح" }
      : { icon: Download, label: "التحميل ممنوع", danger: true },
  );
  items.push(
    policy.allowCopy
      ? { icon: Copy, label: "النسخ مسموح" }
      : { icon: CopySlash, label: "النسخ ممنوع", danger: true },
  );
  items.push(
    policy.allowForward
      ? { icon: Forward, label: "إعادة التوجيه مسموحة" }
      : { icon: Share2, label: "إعادة التوجيه ممنوعة", danger: true },
  );
  if (policy.watermark)
    items.push({ icon: Droplets, label: "علامة مائية باسم المستلم" });
  if (policy.expiresInMin > 0)
    items.push({
      icon: Timer,
      label: `تختفي بعد ${policy.expiresInMin} دقيقة`,
      danger: true,
    });
  if (policy.maxOpens > 0)
    items.push({ icon: Eye, label: `${policy.maxOpens} مرات فتح فقط`, danger: true });
  return items;
}

export function PolicyBadges({
  policy,
  className,
  compact = false,
  onPrimary = false,
}: {
  policy: Policy;
  className?: string;
  compact?: boolean;
  onPrimary?: boolean;
}) {
  const items = policyItems(policy);
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((it) => (
        <span
          key={it.label}
          title={it.label}
          className={cn(
            "inline-flex items-center gap-1 text-[10px]",
            !compact && "rounded-full border px-2 py-0.5",
            onPrimary
              ? cn(
                  "text-primary-foreground/85",
                  !compact && "border-primary-foreground/25 bg-primary-foreground/20",
                )
              : it.danger
                ? cn("text-warning", !compact && "border-warning/40 bg-warning/10")
                : cn(
                    "text-muted-foreground",
                    !compact && "border-border bg-surface-2",
                  ),
          )}
        >
          <it.icon className="size-3" />
          {!compact && it.label}
        </span>
      ))}
    </div>

  );
}
