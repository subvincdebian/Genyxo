"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  NotificationsToastContainer,
  NotificationsNavbar,
  NotificationsNotifContainer,
  NotificationsFaqWindow,
  NotificationsLangModal,
} from "@/widgets/notifications";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function NotificationsPage() {
  useLocalizedMetadata(
    "notifications.meta_title",
    "notifications.meta_description",
  );
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <NotificationsToastContainer dispatch={dispatch} ready={ready} />
      <NotificationsNavbar dispatch={dispatch} ready={ready} />
      <NotificationsNotifContainer dispatch={dispatch} ready={ready} />
      <NotificationsFaqWindow dispatch={dispatch} ready={ready} />
      <NotificationsLangModal dispatch={dispatch} ready={ready} />
    </>
  );
}
