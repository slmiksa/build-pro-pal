import { COMPANY_NAME } from "@/data/seed";
import { cn } from "@/lib/utils";

export function Brand({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "lg" ? 56 : size === "md" ? 34 : 26;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/logo.png"
        alt=""
        width={dim}
        height={dim}
        style={{ width: dim, height: dim }}
        className="shrink-0"
      />
      <div className="leading-tight">
        <div
          className={cn(
            "font-bold tracking-tight",
            size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-base",
          )}
        >
          {COMPANY_NAME}
          <span className="text-primary"> · </span>
          <span className="text-primary">المحادثات المحمية</span>
        </div>
        {size !== "sm" && (
          <div className="text-[11px] text-muted-foreground">
            تواصل داخلي لا يخرج من الشركة
          </div>
        )}
      </div>
    </div>
  );
}
