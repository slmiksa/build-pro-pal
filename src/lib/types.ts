export type UserId = string;

export type Role = "admin" | "manager";

export type User = {
  id: UserId;
  name: string;
  email: string;
  title: string;
  role: Role;
  online: boolean;
  disabled: boolean;
  color: string;
};

export type AttachmentKind = "image" | "pdf" | "doc" | "sheet" | "audio";

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  size: string;
  /** For images: a data/asset URL. For docs: rendered as synthetic pages. */
  src?: string | undefined;
  pages?: string[] | undefined;
  durationSec?: number | undefined;
};

/** Sender-defined protection policy, applied per message. */
export type Policy = {
  allowDownload: boolean;
  allowCopy: boolean;
  blockScreenshot: boolean;
  watermark: boolean;
  /** Minutes until the message self-destructs. 0 = never. */
  expiresInMin: number;
  /** Max number of opens for attachments. 0 = unlimited. */
  maxOpens: number;
};

export const defaultPolicy: Policy = {
  allowDownload: false,
  allowCopy: false,
  blockScreenshot: true,
  watermark: true,
  expiresInMin: 0,
  maxOpens: 0,
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: UserId;
  text?: string | undefined;
  attachment?: Attachment | undefined;
  createdAt: number;
  /** Absolute expiry timestamp, derived from policy at send time. */
  expiresAt?: number | undefined;
  revoked: boolean;
  policy: Policy;
  readBy: UserId[];
  opens: number;
};

export type Conversation = {
  id: string;
  kind: "direct" | "group";
  name?: string | undefined;
  memberIds: UserId[];
  unread: number;
};

export type AuditType =
  | "file_open"
  | "screenshot_attempt"
  | "download_blocked"
  | "copy_blocked"
  | "message_revoked"
  | "message_expired"
  | "login"
  | "invite_created"
  | "member_added"
  | "member_disabled";

export type AuditEvent = {
  id: string;
  type: AuditType;
  actorId: UserId;
  at: number;
  conversationId?: string | undefined;
  messageId?: string | undefined;
  detail: string;
};

export type Invite = {
  id: string;
  code: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
};
