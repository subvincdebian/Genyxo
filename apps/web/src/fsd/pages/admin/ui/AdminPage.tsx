"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  AdminAdminLoader,
  AdminNavbar,
  AdminAdminContainer,
  AdminLangModal,
  AdminReplyModal,
} from "@/widgets/admin";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function AdminPage() {
  useLocalizedMetadata("admin.meta_title", undefined);
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <AdminAdminLoader dispatch={dispatch} ready={ready} />
      <AdminNavbar dispatch={dispatch} ready={ready} />
      <AdminAdminContainer dispatch={dispatch} ready={ready} />
      <AdminLangModal dispatch={dispatch} ready={ready} />
      <AdminReplyModal dispatch={dispatch} ready={ready} />
    </>
  );
}
