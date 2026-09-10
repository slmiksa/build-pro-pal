import { useEffect, useRef } from "react";

/**
 * Screenshot / screen-recording detection.
 *
 * Detection only: it never blocks copy, never blanks the screen on focus loss.
 * Fires `onAttempt(reason)` when a capture shortcut is pressed or a
 * screen-capture session starts, so the app can warn the person capturing and
 * write an audit record for the file owner.
 */
export function useCaptureWatch(options: {
  enabled: boolean;
  onAttempt: (reason: string) => void;
}) {
  const { enabled, onAttempt } = options;
  const cbRef = useRef(onAttempt);
  cbRef.current = onAttempt;
  const lastRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const fire = (reason: string) => {
      const now = Date.now();
      if (now - lastRef.current < 1500) return;
      lastRef.current = now;
      cbRef.current(reason);
    };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      // Windows / Linux: PrintScreen, Win+Shift+S (Snipping Tool)
      if (k === "PrintScreen") {
        fire("زر PrintScreen");
        return;
      }
      if (e.metaKey && e.shiftKey && (k === "S" || k === "s")) {
        fire("أداة القص Win+Shift+S");
        return;
      }
      // macOS: Cmd+Shift+3 / 4 / 5
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k)) {
        fire("اختصار لقطة شاشة على macOS");
      }
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);

    // Screen recording / sharing start
    const md = navigator.mediaDevices as MediaDevices | undefined;
    const original = md?.getDisplayMedia?.bind(md);
    if (md && original) {
      md.getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
        fire("بدء تسجيل أو مشاركة الشاشة");
        return original(constraints);
      };
    }

    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      if (md && original) md.getDisplayMedia = original;
    };
  }, [enabled]);
}
