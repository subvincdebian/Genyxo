"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import { HomeScrollExperience } from "../model/home-scroll-experience";
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
  HomeLangModal,
  HomeFaqWindow,
  HomeAiModelModal,
  HomeCategoryModal,
} from "@/widgets/home";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function HomePage() {
  useLocalizedMetadata("landing.meta_title", "landing.meta_description");
  const { dispatch, ready } = useController(loadController);
  return (
    <div className="gx-home">
      <HomeScrollExperience />
      <HomeToastContainer dispatch={dispatch} ready={ready} />
      <HomeNavbar dispatch={dispatch} ready={ready} />
      <HomeMobileMenu dispatch={dispatch} ready={ready} />
      <HomeMenuOverlay dispatch={dispatch} ready={ready} />
      <HomeHome dispatch={dispatch} ready={ready} />
      <HomeProducts dispatch={dispatch} ready={ready} />
      <HomeAbout dispatch={dispatch} ready={ready} />
      <HomeFooter dispatch={dispatch} ready={ready} />
      <HomeCheckoutModal dispatch={dispatch} ready={ready} />
      <HomeLangModal dispatch={dispatch} ready={ready} />
      <HomeFaqWindow dispatch={dispatch} ready={ready} />
      <HomeAiModelModal dispatch={dispatch} ready={ready} />
      <HomeCategoryModal dispatch={dispatch} ready={ready} />
    </div>
  );
}
