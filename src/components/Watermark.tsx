import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

/** Visible, tiled watermark identifying the viewer — makes leaks traceable. */
export function Watermark({ label }: { label: string }) {
  const [stamp, setStamp] = useState("");
  useEffect(() => {
    const update = () => setStamp(formatDateTime(Date.now()));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, []);

  const rows = Array.from({ length: 8 });
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden opacity-[0.16]">
      <div className="flex h-full w-full flex-col justify-around">
        {rows.map((_, i) => (
          <div
            key={i}
            className="flex whitespace-nowrap gap-10 text-[11px] font-semibold tracking-wide text-foreground"
            style={{ transform: `rotate(-24deg) translateX(${(i % 3) * 40}px)` }}
          >
            {Array.from({ length: 6 }).map((__, j) => (
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
