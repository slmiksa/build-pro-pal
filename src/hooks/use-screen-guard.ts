import { useCallback, useEffect, useState } from "react";

/**
 * Practical browser-side leak deterrence:
 *  - blurs protected content when the window loses focus or is hidden
 *  - reacts to PrintScreen / OS screenshot shortcuts
 *  - detects an active screen-capture (getDisplayMedia) session
 * A browser cannot fully block screenshots; this hides content and reports
 * the attempt so it can be logged and attributed.
 */
export function useScreenGuard(options: {
  enabled: boolean;
  onAttempt?: (reason: string) => void;
}) {
  const { enabled, onAttempt } = options;
  const [masked, setMasked] = useState(false);

  const trigger = useCallback(
    (reason: string) => {
      setMasked(true);
      onAttempt?.(reason);
    },
    [onAttempt],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onBlur = () => setMasked(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") trigger("مغادرة النافذة");
    };
    const onKey = (e: KeyboardEvent) => {
      const key = e.key;
      const combo =
        key === "PrintScreen" ||
        (e.metaKey && e.shiftKey && ["3", "4", "5", "s"].includes(key)) ||
        (e.metaKey && key === "p") ||
        (e.ctrlKey && key === "p") ||
        (e.shiftKey && e.metaKey && key === "S");
      if (combo) {
        e.preventDefault();
        trigger("اختصار التقاط شاشة");
      }
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    document.addEventListener("contextmenu", onContext);

    // Screen-recording detection: patch getDisplayMedia for this session.
    const md = navigator.mediaDevices as MediaDevices | undefined;
    const original = md?.getDisplayMedia?.bind(md);
    if (md && original) {
      md.getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
        trigger("بدء تسجيل الشاشة");
        return original(constraints);
      };
    }

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      document.removeEventListener("contextmenu", onContext);
      if (md && original) md.getDisplayMedia = original;
    };
  }, [enabled, trigger]);

  return { masked, reveal: () => setMasked(false), trigger };
}
