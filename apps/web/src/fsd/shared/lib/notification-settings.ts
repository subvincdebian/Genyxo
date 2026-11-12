/**
 * Notification preferences shared by the settings page, the chat and the
 * real-time socket. Stored in the account's interaction settings so every
 * device and the backend (which decides on email) read the same choice.
 * Keep categories and defaults in sync with
 * apps/backend/src/notifications/notification-preferences.ts.
 */
export type NotificationChannel = "push" | "email";
export type NotificationCategory =
  | "responses"
  | "scheduled"
  | "support"
  | "billing"
  | "security"
  | "product";
export type ChannelChoice = { push: boolean; email: boolean };
export type NotificationPreferences = {
  categories: Record<NotificationCategory, ChannelChoice>;
  sound: boolean;
};

export const NOTIFICATION_CATEGORIES: readonly {
  id: NotificationCategory;
  title: string;
  description: string;
  channels: readonly NotificationChannel[];
}[] = [
  {
    id: "responses",
    title: "Responses",
    description:
      "Get notified when an AI model finishes answering while you are in another tab or app.",
    channels: ["push"],
  },
  {
    id: "scheduled",
    title: "Scheduled tasks",
    description:
      "Get notified when your scheduled tasks finish or fail to run.",
    channels: ["push", "email"],
  },
  {
    id: "support",
    title: "Support replies",
    description: "Get notified when our team replies to your support request.",
    channels: ["push", "email"],
  },
  {
    id: "billing",
    title: "Credits & billing",
    description: "Purchases, receipts and credits added to your account.",
    channels: ["push", "email"],
  },
  {
    id: "security",
    title: "Security alerts",
    description: "Sign-ins to your account from a new device or browser.",
    channels: ["push", "email"],
  },
  {
    id: "product",
    title: "Product updates",
    description: "New AI models, tools and features in Genyxo.",
    channels: ["email"],
  },
];

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  categories: {
    responses: { push: true, email: false },
    scheduled: { push: true, email: true },
    support: { push: true, email: true },
    billing: { push: true, email: true },
    security: { push: true, email: true },
    product: { push: false, email: false },
  },
  sound: true,
};

export function mergeNotifications(value: unknown): NotificationPreferences {
  const input =
    value && typeof value === "object"
      ? (value as Partial<NotificationPreferences>)
      : {};
  const categories = { ...DEFAULT_NOTIFICATIONS.categories };
  for (const item of NOTIFICATION_CATEGORIES) {
    const choice = input.categories?.[item.id];
    if (!choice || typeof choice !== "object") continue;
    categories[item.id] = {
      // A channel the category does not offer is always off.
      push:
        item.channels.includes("push") && typeof choice.push === "boolean"
          ? choice.push
          : categories[item.id].push,
      email:
        item.channels.includes("email") && typeof choice.email === "boolean"
          ? choice.email
          : categories[item.id].email,
    };
  }
  return {
    categories,
    sound:
      typeof input.sound === "boolean"
        ? input.sound
        : DEFAULT_NOTIFICATIONS.sound,
  };
}
