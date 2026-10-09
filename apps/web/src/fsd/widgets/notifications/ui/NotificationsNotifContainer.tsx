"use client";
import type { SyntheticEvent } from "react";

import { NotificationsContent } from "@/features/notifications";

export function NotificationsNotifContainer({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return <NotificationsContent />;
}
