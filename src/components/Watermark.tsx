import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

/**
 * Visible, tiled watermark identifying the viewer — makes leaks traceable.
 * Fixed to the viewport so it covers every pixel of the page at all times,
 * including while scrolling and while the file is still loading.
 */
export function Watermark({ label }: { label: string }) {
  const [stamp, setStamp] = useState("");
  useEffect(() => {
    const update = () => setStamp(formatDateTime(Date.now()));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, []);

  const rows = Array.from({ length: 14 });
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] overflow-hidden opacity-[0.15]"
    >
      <div className="flex h-[130%] w-[130%] -translate-x-[10%] -translate-y-[10%] flex-col justify-around">
        {rows.map((_, i) => (
          <div
            key={i}
            className="flex whitespace-nowrap gap-8 text-[11px] font-semibold tracking-wide text-foreground"
            style={{
              transform: `rotate(-24deg) translateX(${(i % 3) * 60 - 120}px)`,
            }}
          >
            {Array.from({ length: 8 }).map((__, j) => (
              <span key={j}>
                {label} · {stamp} · سري
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
