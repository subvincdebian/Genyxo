"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  HomeToastContainer,
  HomeNavbar,
  HomeMobileMenu,
  HomeMenuOverlay,
  HomeHome,
  HomeProducts,
  HomeAbout,
  HomeFooter,
  HomeCheckoutModal,
  HomeLoginModal,
  HomeLangModal,
  HomeVerifyEmailModal,
  HomeFaqWindow,
  HomeDemoChatModal,
  HomeAiModelModal,
  HomeCategoryModal,
} from "@/widgets/home";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function HomePage() {
  useLocalizedMetadata("hero.main_title", "hero.meta_description");
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <HomeToastContainer dispatch={dispatch} ready={ready} />
      <HomeNavbar dispatch={dispatch} ready={ready} />
      <HomeMobileMenu dispatch={dispatch} ready={ready} />
      <HomeMenuOverlay dispatch={dispatch} ready={ready} />
      <HomeHome dispatch={dispatch} ready={ready} />
      <HomeProducts dispatch={dispatch} ready={ready} />
      <HomeAbout dispatch={dispatch} ready={ready} />
      <HomeFooter dispatch={dispatch} ready={ready} />
      <HomeCheckoutModal dispatch={dispatch} ready={ready} />
      <HomeLoginModal dispatch={dispatch} ready={ready} />
      <HomeLangModal dispatch={dispatch} ready={ready} />
      <HomeVerifyEmailModal dispatch={dispatch} ready={ready} />
      <HomeFaqWindow dispatch={dispatch} ready={ready} />
      <HomeDemoChatModal dispatch={dispatch} ready={ready} />
      <HomeAiModelModal dispatch={dispatch} ready={ready} />
      <HomeCategoryModal dispatch={dispatch} ready={ready} />
    </>
  );
}
