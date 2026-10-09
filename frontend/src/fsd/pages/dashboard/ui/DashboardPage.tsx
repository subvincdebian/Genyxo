"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  DashboardAdminNavbar,
  DashboardAdminLayout,
  DashboardSidebarOverlay,
} from "@/widgets/dashboard";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function DashboardPage() {
  useLocalizedMetadata(undefined, undefined);
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <DashboardAdminNavbar dispatch={dispatch} ready={ready} />
      <DashboardAdminLayout dispatch={dispatch} ready={ready} />
      <DashboardSidebarOverlay dispatch={dispatch} ready={ready} />
    </>
  );
}
