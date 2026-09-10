import type { ReactNode } from "react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Round avatar that shows the member picture when available. */
export function UserAvatar({
  name,
  color,
  avatarUrl,
  className,
  fallback,
}: {
  name: string;
  color?: string | undefined;
  avatarUrl?: string | undefined;
  className?: string | undefined;
  fallback?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-primary-foreground",
        className,
      )}
      style={{ backgroundColor: color ?? "#0ea5a5" }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="size-full object-cover"
          draggable={false}
        />
      ) : (
        (fallback ?? initials(name))
      )}
    </span>
  );
}
