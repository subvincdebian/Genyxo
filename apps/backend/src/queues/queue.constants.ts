export const QUEUE_NAMES = {
  EMAIL: "email-queue",
} as const;

export const EMAIL_JOBS = {
  VERIFICATION: "send-verification",
  SUPPORT_REPLY: "send-support-reply",
} as const;

export interface VerificationEmailJobData {
  email: string;
  token: string;
}

export interface SupportReplyEmailJobData {
  email: string;
  userName: string;
  ticketSubject: string;
  adminReply: string;
}
