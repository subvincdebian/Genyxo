"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  FaqToastContainer,
  FaqOverlay,
  FaqNavbar,
  FaqLegalNavWrapper,
  FaqPrivacyLayout,
  FaqFooter,
} from "@/widgets/faq";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function FaqPage() {
  useLocalizedMetadata(undefined, undefined);
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <FaqToastContainer dispatch={dispatch} ready={ready} />
      <FaqOverlay dispatch={dispatch} ready={ready} />
      <FaqNavbar dispatch={dispatch} ready={ready} />
      <FaqLegalNavWrapper dispatch={dispatch} ready={ready} />
      <FaqPrivacyLayout dispatch={dispatch} ready={ready} />
      <FaqFooter dispatch={dispatch} ready={ready} />
    </>
  );
}
