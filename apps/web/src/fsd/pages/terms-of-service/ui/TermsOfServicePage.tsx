"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  TermsOfServiceToastContainer,
  TermsOfServiceOverlay,
  TermsOfServiceNavbar,
  TermsOfServiceLegalNavWrapper,
  TermsOfServicePrivacyLayout,
  TermsOfServiceFooter,
} from "@/widgets/terms-of-service";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function TermsOfServicePage() {
  useLocalizedMetadata(undefined, undefined);
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <TermsOfServiceToastContainer dispatch={dispatch} ready={ready} />
      <TermsOfServiceOverlay dispatch={dispatch} ready={ready} />
      <TermsOfServiceNavbar dispatch={dispatch} ready={ready} />
      <TermsOfServiceLegalNavWrapper dispatch={dispatch} ready={ready} />
      <TermsOfServicePrivacyLayout dispatch={dispatch} ready={ready} />
      <TermsOfServiceFooter dispatch={dispatch} ready={ready} />
    </>
  );
}
