import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LogOut, MessagesSquare, ScrollText, Users } from "lucide-react";
import { NotificationsBanner } from "@/components/NotificationsPrompt";
import { useAppHeight } from "@/hooks/use-app-height";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app";

const tabs = [
  { to: "/chat", label: "المحادثات", icon: MessagesSquare },
  { to: "/admin", label: "الأعضاء", icon: Users },
  { to: "/audit", label: "السجل", icon: ScrollText },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  header,
  padded = true,
  hideTabs = false,
  showProfile = true,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  padded?: boolean;
  hideTabs?: boolean;
  showProfile?: boolean;
}) {
  const { currentUser, currentUserId, ready, signOut } = useApp();
  const navigate = useNavigate();
  useAppHeight();

  useEffect(() => {
    if (ready && !currentUserId) navigate({ to: "/", replace: true });
  }, [ready, currentUserId, navigate]);

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        جارٍ تحميل الحساب…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
        {/* Desktop side navigation */}
        <aside className="hidden w-48 shrink-0 flex-col gap-0.5 border-e border-border bg-surface p-3 md:flex">
          <div className="mb-3 flex items-center gap-2 px-2">
            <img src="/logo.png" alt="شعار درع" width={26} height={26} className="size-[26px]" />
            <span className="font-display text-base font-semibold">درع</span>
          </div>
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-background"
              activeProps={{
                  className: "bg-accent text-primary font-semibold",
              }}
            >
              <t.icon className="size-[18px]" />
              {t.label}
            </Link>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {header ?? (
          <header className="pt-safe shrink-0 border-b border-border bg-surface px-4 pt-2.5 pb-2.5 md:px-5 md:py-2.5">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display truncate text-[17px] leading-tight font-semibold tracking-[-0.01em]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {showProfile && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background p-1">
                  <span
                    className="flex size-8 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {initials(currentUser.name)}
                  </span>
                  <button
                    type="button"
                    aria-label="خروج"
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition-all hover:bg-background hover:text-foreground active:scale-95"
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/", replace: true });
                    }}
                  >
                    <LogOut className="size-[17px]" />
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        <NotificationsBanner />

        <main
          className={cn(
            "min-h-0 flex-1",
            padded
              ? "w-full overflow-x-hidden overflow-y-auto px-4 pt-3 pb-4 md:px-5"
              : "flex w-full flex-col overflow-hidden",
          )}
        >
          {children}
        </main>

        {!hideTabs && (
          <nav className="pb-safe shrink-0 bg-background px-4 pt-1.5 md:hidden">
            <div className="grid grid-cols-3 rounded-[24px] bg-surface-2/90 p-1">
              {tabs.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="flex flex-col items-center gap-1 rounded-[20px] py-2.5 text-[10.5px] font-medium text-muted-foreground transition-all active:scale-95"
                  activeProps={{
                    className:
                      "bg-background text-primary font-semibold shadow-[0_6px_16px_-8px_rgba(14,21,18,0.35)]",
                  }}
                >
                  <t.icon className="size-5" />
                  {t.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
        </div>
      </div>
    </div>
  );
}
