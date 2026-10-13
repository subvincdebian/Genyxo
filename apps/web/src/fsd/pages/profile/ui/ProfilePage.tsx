"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  ProfileToastContainer,
  ProfileNavbar,
  ProfileMobileMenu,
  ProfileMenuOverlay,
  ProfileProfilePage,
  ProfileFaqWindow,
  ProfileLangModal,
} from "@/widgets/profile";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function ProfilePage() {
  useLocalizedMetadata("profile.title", "profile.description");
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <ProfileToastContainer dispatch={dispatch} ready={ready} />
      <ProfileNavbar dispatch={dispatch} ready={ready} />
      <ProfileMobileMenu dispatch={dispatch} ready={ready} />
      <ProfileMenuOverlay dispatch={dispatch} ready={ready} />
      <ProfileProfilePage dispatch={dispatch} ready={ready} />
      <ProfileFaqWindow dispatch={dispatch} ready={ready} />
      <ProfileLangModal dispatch={dispatch} ready={ready} />
    </>
  );
}
