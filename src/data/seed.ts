import type {
  AuditEvent,
  Conversation,
  Invite,
  Message,
  User,
} from "@/lib/types";
import { defaultPolicy } from "@/lib/types";

export const COMPANY_NAME = "درع";
export const COMPANY_DOMAIN = "company.sa";

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Built lazily so no time/random work happens at module scope. */
export function buildSeed(now: number) {
  const users: User[] = [
    {
      id: "u1",
      name: "سالم إبراهيم",
      email: `salem@${COMPANY_DOMAIN}`,
      title: "الرئيس التنفيذي",
      role: "admin",
      online: true,
      disabled: false,
      color: "oklch(0.72 0.13 165)",
    },
    {
      id: "u2",
      name: "نورة القحطاني",
      email: `noura@${COMPANY_DOMAIN}`,
      title: "مديرة المالية",
      role: "manager",
      online: true,
      disabled: false,
      color: "oklch(0.7 0.14 250)",
    },
    {
      id: "u3",
      name: "فهد العتيبي",
      email: `fahad@${COMPANY_DOMAIN}`,
      title: "مدير العمليات",
      role: "manager",
      online: false,
      disabled: false,
      color: "oklch(0.74 0.13 60)",
    },
    {
      id: "u4",
      name: "ليان الحربي",
      email: `layan@${COMPANY_DOMAIN}`,
      title: "مديرة الموارد البشرية",
      role: "manager",
      online: true,
      disabled: false,
      color: "oklch(0.68 0.15 330)",
    },
    {
      id: "u5",
      name: "عبدالله الدوسري",
      email: `abdullah@${COMPANY_DOMAIN}`,
      title: "مدير تقنية المعلومات",
      role: "manager",
      online: false,
      disabled: true,
      color: "oklch(0.7 0.12 200)",
    },
  ];

  const conversations: Conversation[] = [
    { id: "c1", kind: "direct", memberIds: ["u1", "u2"], unread: 2 },
    { id: "c2", kind: "direct", memberIds: ["u1", "u3"], unread: 0 },
    {
      id: "c3",
      kind: "group",
      name: "مجلس الإدارة",
      memberIds: ["u1", "u2", "u3", "u4"],
      unread: 5,
    },
    {
      id: "c4",
      kind: "group",
      name: "المالية — سري",
      memberIds: ["u1", "u2", "u3"],
      unread: 0,
    },
    { id: "c5", kind: "direct", memberIds: ["u1", "u4"], unread: 0 },
  ];

  const strict = {
    ...defaultPolicy,
    allowDownload: false,
    allowCopy: false,
    blockScreenshot: true,
    watermark: true,
  };
  const relaxed = {
    ...defaultPolicy,
    allowDownload: true,
    allowCopy: true,
    blockScreenshot: false,
    watermark: false,
  };

  const messages: Message[] = [
    {
      id: "m1",
      conversationId: "c1",
      senderId: "u2",
      text: "صباح الخير، جهزت مسودة الميزانية للربع القادم.",
      createdAt: now - 5 * HOUR,
      revoked: false,
      policy: relaxed,
      readBy: ["u1", "u2"],
      opens: 0,
    },
    {
      id: "m2",
      conversationId: "c1",
      senderId: "u2",
      attachment: {
        id: "a1",
        kind: "pdf",
        name: "ميزانية-الربع-الرابع.pdf",
        size: "٢٫٤ م.ب",
        pages: [
          "ملخص تنفيذي — إجمالي المصروفات المتوقعة ١٢٤ مليون ريال، بنمو ٨٪ عن الربع السابق.",
          "توزيع البنود: التشغيل ٤٨٪، الرواتب ٣١٪، التقنية ١٤٪، التسويق ٧٪.",
          "المخاطر: تقلب أسعار التوريد، وتأخر تحصيل ثلاثة عقود حكومية.",
        ],
      },
      createdAt: now - 4.6 * HOUR,
      revoked: false,
      policy: { ...strict, maxOpens: 3 },
      readBy: ["u1"],
      opens: 1,
    },
    {
      id: "m3",
      conversationId: "c1",
      senderId: "u1",
      text: "وصلني. لا تشاركيه مع أي جهة خارجية أبداً.",
      createdAt: now - 4.2 * HOUR,
      revoked: false,
      policy: strict,
      readBy: ["u1", "u2"],
      opens: 0,
    },
    {
      id: "m4",
      conversationId: "c1",
      senderId: "u2",
      text: "هذه الرسالة ستختفي تلقائياً.",
      createdAt: now - 2 * MIN,
      expiresAt: now + 8 * MIN,
      revoked: false,
      policy: { ...strict, expiresInMin: 10 },
      readBy: ["u2"],
      opens: 0,
    },
    {
      id: "m5",
      conversationId: "c3",
      senderId: "u3",
      text: "تم رفع تقرير العمليات الأسبوعي، يرجى الاطلاع قبل الاجتماع.",
      createdAt: now - 26 * HOUR,
      revoked: false,
      policy: relaxed,
      readBy: ["u1", "u3", "u4"],
      opens: 0,
    },
    {
      id: "m6",
      conversationId: "c3",
      senderId: "u4",
      attachment: {
        id: "a2",
        kind: "sheet",
        name: "كشف-الرواتب-سري.xlsx",
        size: "٨٦٠ ك.ب",
        pages: [
          "٤٨ موظفاً — إجمالي الرواتب الشهرية ١٫٩ مليون ريال.",
          "بدلات ومكافآت الربع: ٢٤٠ ألف ريال.",
        ],
      },
      createdAt: now - 20 * HOUR,
      revoked: false,
      policy: { ...strict, maxOpens: 1 },
      readBy: ["u4"],
      opens: 0,
    },
    {
      id: "m7",
      conversationId: "c3",
      senderId: "u2",
      text: "هذه رسالة تم سحبها كمثال.",
      createdAt: now - 18 * HOUR,
      revoked: true,
      policy: strict,
      readBy: ["u2"],
      opens: 0,
    },
    {
      id: "m8",
      conversationId: "c4",
      senderId: "u1",
      text: "الاجتماع القادم بخصوص التدفقات النقدية، الأحد ١٠ صباحاً.",
      createdAt: now - 3 * HOUR,
      revoked: false,
      policy: relaxed,
      readBy: ["u1", "u2", "u3"],
      opens: 0,
    },
    {
      id: "m9",
      conversationId: "c2",
      senderId: "u3",
      attachment: {
        id: "a3",
        kind: "audio",
        name: "ملاحظة صوتية",
        size: "١٤٠ ك.ب",
        durationSec: 23,
      },
      createdAt: now - 40 * MIN,
      revoked: false,
      policy: strict,
      readBy: ["u1", "u3"],
      opens: 0,
    },
    {
      id: "m10",
      conversationId: "c5",
      senderId: "u4",
      text: "أرسلت لك عقد الموظف الجديد للاعتماد.",
      createdAt: now - 9 * HOUR,
      revoked: false,
      policy: strict,
      readBy: ["u1", "u4"],
      opens: 0,
    },
  ];

  const audit: AuditEvent[] = [
    {
      id: "e1",
      type: "screenshot_attempt",
      actorId: "u3",
      at: now - 3.4 * HOUR,
      conversationId: "c3",
      messageId: "m6",
      detail: "محاولة التقاط شاشة أثناء عرض «كشف-الرواتب-سري.xlsx»",
    },
    {
      id: "e2",
      type: "file_open",
      actorId: "u1",
      at: now - 4.4 * HOUR,
      conversationId: "c1",
      messageId: "m2",
      detail: "فتح «ميزانية-الربع-الرابع.pdf» — الفتح ١ من ٣",
    },
    {
      id: "e3",
      type: "download_blocked",
      actorId: "u4",
      at: now - 6 * HOUR,
      conversationId: "c3",
      messageId: "m6",
      detail: "محاولة تحميل مرفوضة — التحميل غير مسموح",
    },
    {
      id: "e4",
      type: "message_revoked",
      actorId: "u2",
      at: now - 17 * HOUR,
      conversationId: "c3",
      messageId: "m7",
      detail: "سحب رسالة للجميع",
    },
    {
      id: "e5",
      type: "login",
      actorId: "u2",
      at: now - 26 * HOUR,
      detail: "تسجيل دخول ناجح",
    },
    {
      id: "e6",
      type: "copy_blocked",
      actorId: "u3",
      at: now - 28 * HOUR,
      conversationId: "c4",
      detail: "محاولة نسخ نص محمي",
    },
  ];

  const invites: Invite[] = [
    {
      id: "i1",
      code: "DR7-4M2K",
      email: `mansour@${COMPANY_DOMAIN}`,
      createdAt: now - 20 * HOUR,
      expiresAt: now + 28 * HOUR,
      used: false,
    },
    {
      id: "i2",
      code: "DR7-9QX1",
      email: `hind@${COMPANY_DOMAIN}`,
      createdAt: now - 70 * HOUR,
      expiresAt: now - 22 * HOUR,
      used: true,
    },
  ];

  return { users, conversations, messages, audit, invites };
}
