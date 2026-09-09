import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LogOut, MessagesSquare, ScrollText, Users } from "lucide-react";
import { useAppHeight } from "@/hooks/use-app-height";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app";

const tabs = [
  { to: "/chat", label: "المحادثات", icon: MessagesSquare },
  { to: "/admin", label: "الأعضاء", icon: Users },
  { to: "/audit", label: "السجل", icon: ScrollText },
] as const;

/**
 * Phone-shaped shell, iOS-minimal: no colored bar — the header shares the page
 * background, uses a large title and circular soft-tinted icon buttons, and the
 * tab bar floats above the safe area.
 */
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
    <div className="app-viewport flex justify-center bg-surface-2 lg:py-8">
      <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-background lg:h-[calc(100dvh-4rem)] lg:rounded-[2.75rem] lg:shadow-[0_32px_64px_-24px_rgba(14,21,18,0.18)]">
        {header ?? (
          <header className="pt-safe shrink-0 bg-background px-5 pt-3 pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display truncate text-[22px] leading-tight font-semibold tracking-[-0.01em]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {showProfile && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2/80 p-1">
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

        <main
          className={cn(
            "min-h-0 flex-1",
            padded ? "overflow-x-hidden overflow-y-auto px-6 pt-4 pb-4" : "flex flex-col overflow-hidden",
          )}
        >
          {children}
        </main>

        {!hideTabs && (
          <nav className="pb-safe shrink-0 bg-background px-6 pt-2">
            <div className="grid grid-cols-3 rounded-[26px] bg-surface-2 p-1.5">
              {tabs.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="flex flex-col items-center gap-1 rounded-[20px] py-2 text-[10px] font-medium text-muted-foreground transition-all active:scale-95"
                  activeProps={{
                    className: "bg-background text-primary shadow-sm font-semibold",
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
  );
}
