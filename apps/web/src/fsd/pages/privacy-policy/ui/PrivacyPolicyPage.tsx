"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  PrivacyPolicyToastContainer,
  PrivacyPolicySidebarOverlay,
  PrivacyPolicyNavbar,
  PrivacyPolicyLegalNavWrapper,
  PrivacyPolicyPrivacyLayout,
  PrivacyPolicyFooter,
} from "@/widgets/privacy-policy";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function PrivacyPolicyPage() {
  useLocalizedMetadata(undefined, undefined);
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <PrivacyPolicyToastContainer dispatch={dispatch} ready={ready} />
      <PrivacyPolicySidebarOverlay dispatch={dispatch} ready={ready} />
      <PrivacyPolicyNavbar dispatch={dispatch} ready={ready} />
      <PrivacyPolicyLegalNavWrapper dispatch={dispatch} ready={ready} />
      <PrivacyPolicyPrivacyLayout dispatch={dispatch} ready={ready} />
      <PrivacyPolicyFooter dispatch={dispatch} ready={ready} />
    </>
  );
}
