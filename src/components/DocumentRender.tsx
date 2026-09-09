import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type Sheet = { name: string; html: string };

/**
 * Renders Office / tabular documents (xlsx, xls, csv, docx) inside the app so
 * a protected file never has to be downloaded to be read.
 */
export function DocumentRender({
  blob,
  kind,
}: {
  blob: Blob;
  kind: "spreadsheet" | "word";
}) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [wordReady, setWordReady] = useState(false);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const wordRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSheets(null);
    setWordReady(false);
    setFailed(false);
    setActive(0);

    const run = async () => {
      try {
        if (kind === "spreadsheet") {
          const buffer = await blob.arrayBuffer();
          const XLSX = await import("xlsx");
          const wb = XLSX.read(buffer, { type: "array" });
          const out: Sheet[] = wb.SheetNames.map((name) => ({
            name,
            html: XLSX.utils.sheet_to_html(wb.Sheets[name]!, {
              header: "",
              footer: "",
            }),
          }));
          if (!cancelled) setSheets(out);
          return;
        }

        const { renderAsync } = await import("docx-preview");
        // Wait a tick so the target container exists in the DOM.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const host = wordRef.current;
        if (cancelled || !host) return;
        host.innerHTML = "";
        await renderAsync(blob, host, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: false,
          experimental: true,
          useBase64URL: true,
        });
        if (!cancelled) setWordReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [blob, kind]);

  if (failed)
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        تعذّر قراءة محتوى هذا الملف.
      </div>
    );

  if (kind === "word")
    return (
      <div className="space-y-3">
        {!wordReady && (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">جارٍ تجهيز الملف للعرض…</p>
          </div>
        )}
        <div
          ref={wordRef}
          dir="auto"
          className={`doc-view overflow-auto rounded-xl border border-border bg-surface p-3 shadow-sm ${
            wordReady ? "" : "hidden"
          }`}
        />
      </div>
    );

  if (!sheets)
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">جارٍ تجهيز الملف للعرض…</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {sheets.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === active
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-muted-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div
        dir="ltr"
        className="sheet-view overflow-auto rounded-xl border border-border bg-surface p-2 shadow-sm"
        dangerouslySetInnerHTML={{ __html: sheets[active]?.html ?? "" }}
      />
    </div>
  );
}
