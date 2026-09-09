/**
 * Local message notifications.
 *
 * Uses the browser Notification API so an installed web app (Android/iOS 16.4+)
 * can alert the user when a new message arrives while the app is running or
 * sitting in the background. True server-side push (app fully closed) needs a
 * push provider and is not wired here.
 */

export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

export function notifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotifyPermission {
  if (!notifySupported()) return "unsupported";
  return Notification.permission as NotifyPermission;
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!notifySupported()) return "unsupported";
  if (Notification.permission !== "default") {
    return Notification.permission as NotifyPermission;
  }
  try {
    const res = await Notification.requestPermission();
    return res as NotifyPermission;
  } catch {
    return "denied";
  }
}

let lastAt = 0;

export function showMessageNotification(opts: {
  title: string;
  body: string;
  tag?: string;
}) {
  if (!notifySupported() || Notification.permission !== "granted") return;
  // Don't buzz when the user is already looking at the app.
  if (typeof document !== "undefined" && document.visibilityState === "visible")
    return;
  const now = Date.now();
  if (now - lastAt < 800) return;
  lastAt = now;

  const payload: NotificationOptions = {
    body: opts.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: opts.tag ?? "dir3-message",
    dir: "rtl",
    lang: "ar",
  };

  try {
    new Notification(opts.title, payload);
  } catch {
    // iOS installed web apps only allow notifications through a service worker.
    void navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(opts.title, payload))
      .catch(() => undefined);
  }
}
