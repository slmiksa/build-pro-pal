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
        const vh = vv?.height ?? window.innerHeight;
        const layout = window.innerHeight;
        largestHeight = Math.max(largestHeight, layout, vh);
        // The keyboard is open only when the visual viewport shrinks a lot.
        const keyboardOpen = largestHeight - vh > 120;
        // Otherwise always fill the real screen height so no dead space is left
        // under the tab bar inside a WebView.
        const h = keyboardOpen ? vh : Math.max(layout, vh);
        document.documentElement.style.setProperty("--app-h", `${h}px`);
        document.documentElement.style.setProperty(
          "--app-top",
          `${keyboardOpen ? Math.max(0, vv?.offsetTop ?? 0) : 0}px`,
        );
        document.documentElement.toggleAttribute(
          "data-keyboard-open",
          keyboardOpen,
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
