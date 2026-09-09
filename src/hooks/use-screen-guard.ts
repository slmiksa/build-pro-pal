import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pre-emptive leak deterrence: the content is blacked out the instant a key
 * that can start a screenshot goes down (Meta / Ctrl / Alt / PrintScreen), so
 * the capture itself lands on a black screen instead of the content.
 * Also masks on focus loss, tab hiding, pointer leaving the window, and when a
 * screen-capture session starts.
 */
export function useScreenGuard(options: {
  enabled: boolean;
  onAttempt?: (reason: string) => void;
}) {
  const { enabled, onAttempt } = options;
  const [masked, setMasked] = useState(false);
  const reported = useRef(false);

  const trigger = useCallback(
    (reason: string) => {
      setMasked(true);
      if (reported.current) return;
      reported.current = true;
      onAttempt?.(reason);
      window.setTimeout(() => {
        reported.current = false;
      }, 1500);
    },
    [onAttempt],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Mask on key DOWN of any modifier that can begin a capture shortcut,
    // before the full combination is completed.
    const onKey = (e: KeyboardEvent) => {
      const key = e.key;
      const risky =
        key === "PrintScreen" ||
        key === "Meta" ||
        key === "OS" ||
        key === "Control" ||
        key === "Alt" ||
        e.metaKey ||
        e.ctrlKey ||
        (e.shiftKey && (e.metaKey || e.ctrlKey));
      if (risky) {
        e.preventDefault();
        trigger("اختصار التقاط شاشة");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        window.setTimeout(() => setMasked(false), 1200);
      }
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    // Mobile: the system screenshot UI steals focus for a moment. On touch
    // devices that focus loss is the only available capture signal, so mask
    // instantly there (desktop relies on the key shortcuts above instead).
    const isTouch = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const onMobileCapture = () => {
      if (isTouch) trigger("محاولة التقاط شاشة");
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("contextmenu", onContext);
    if (isTouch) window.addEventListener("blur", onMobileCapture);

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
      window.removeEventListener("blur", onMobileCapture);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("contextmenu", onContext);
      if (md && original) md.getDisplayMedia = original;
    };
  }, [enabled, trigger]);

  return { masked, reveal: () => setMasked(false), trigger };
}
