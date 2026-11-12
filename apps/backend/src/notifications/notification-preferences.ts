import { BadRequestException } from "@nestjs/common";

/**
 * Notification categories and channel defaults. Mirrors
 * apps/web/src/fsd/shared/lib/notification-settings.ts.
 */
export const NOTIFICATION_CHANNELS = {
  responses: ["push"],
  scheduled: ["push", "email"],
  support: ["push", "email"],
  billing: ["push", "email"],
  security: ["push", "email"],
  product: ["email"],
} as const;
export type NotificationCategory = keyof typeof NOTIFICATION_CHANNELS;
export type ChannelChoice = { push: boolean; email: boolean };
export type NotificationPreferences = {
  categories: Record<NotificationCategory, ChannelChoice>;
  sound: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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

const categories = Object.keys(NOTIFICATION_CHANNELS) as NotificationCategory[];

export function mergeNotificationPreferences(
  value: unknown,
): NotificationPreferences {
  const input =
    value && typeof value === "object"
      ? (value as Partial<NotificationPreferences>)
      : {};
  const merged = {
    categories: { ...DEFAULT_NOTIFICATION_PREFERENCES.categories },
    sound:
      typeof input.sound === "boolean"
        ? input.sound
        : DEFAULT_NOTIFICATION_PREFERENCES.sound,
  };
  for (const id of categories) {
    const choice = input.categories?.[id];
    if (!choice || typeof choice !== "object") continue;
    const offered = NOTIFICATION_CHANNELS[id] as readonly string[];
    merged.categories[id] = {
      push:
        offered.includes("push") && typeof choice.push === "boolean"
          ? choice.push
          : merged.categories[id].push,
      email:
        offered.includes("email") && typeof choice.email === "boolean"
          ? choice.email
          : merged.categories[id].email,
    };
  }
  return merged;
}

/** Reject unknown categories, channels or non-boolean values. */
export function assertNotificationPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BadRequestException("Invalid notification settings");
  const {
    categories: patch,
    sound,
    ...rest
  } = value as Record<string, unknown>;
  if (Object.keys(rest).length)
    throw new BadRequestException("Invalid notification settings");
  if (sound !== undefined && typeof sound !== "boolean")
    throw new BadRequestException("Invalid notification sound setting");
  if (patch === undefined) return;
  if (!patch || typeof patch !== "object" || Array.isArray(patch))
    throw new BadRequestException("Invalid notification categories");
  for (const [id, choice] of Object.entries(patch)) {
    if (!(id in NOTIFICATION_CHANNELS))
      throw new BadRequestException(`Unknown notification category: ${id}`);
    if (!choice || typeof choice !== "object" || Array.isArray(choice))
      throw new BadRequestException("Invalid notification channels");
    for (const [channel, enabled] of Object.entries(choice)) {
      if (!["push", "email"].includes(channel) || typeof enabled !== "boolean")
        throw new BadRequestException("Invalid notification channels");
    }
  }
}
