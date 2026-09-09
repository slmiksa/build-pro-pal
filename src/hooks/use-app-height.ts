import { useEffect } from "react";

/**
 * Keeps a CSS var `--app-h` in sync with the *visual* viewport so the app frame
 * stays fixed when the on-screen keyboard opens (native-app behaviour instead of
 * the page sliding/scrolling like a web page).
 */
export function useAppHeight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    let frame = 0;
    let largestHeight = window.innerHeight;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
      const h = vv?.height ?? window.innerHeight;
      largestHeight = Math.max(largestHeight, window.innerHeight, h);
      document.documentElement.style.setProperty("--app-h", `${h}px`);
      document.documentElement.style.setProperty(
        "--app-top",
        `${Math.max(0, vv?.offsetTop ?? 0)}px`,
      );
      document.documentElement.toggleAttribute(
        "data-keyboard-open",
        largestHeight - h > 120,
      );
      });
    };

    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("resize", apply);
    document.addEventListener("focusin", apply);
    document.addEventListener("focusout", apply);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("resize", apply);
      document.removeEventListener("focusin", apply);
      document.removeEventListener("focusout", apply);
      document.documentElement.removeAttribute("data-keyboard-open");
    };
  }, []);
}
