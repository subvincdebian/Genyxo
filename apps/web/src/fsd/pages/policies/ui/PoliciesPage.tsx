"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  PoliciesToastContainer,
  PoliciesOverlay,
  PoliciesNavbar,
  PoliciesLegalNavWrapper,
  PoliciesLegalContentWrapper,
  PoliciesMobileMenu,
  PoliciesMenuOverlay,
  PoliciesFooter,
} from "@/widgets/policies";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function PoliciesPage() {
  useLocalizedMetadata(undefined, undefined);
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <PoliciesToastContainer dispatch={dispatch} ready={ready} />
      <PoliciesOverlay dispatch={dispatch} ready={ready} />
      <PoliciesNavbar dispatch={dispatch} ready={ready} />
      <PoliciesLegalNavWrapper dispatch={dispatch} ready={ready} />
      <PoliciesLegalContentWrapper dispatch={dispatch} ready={ready} />
      <PoliciesMobileMenu dispatch={dispatch} ready={ready} />
      <PoliciesMenuOverlay dispatch={dispatch} ready={ready} />
      <PoliciesFooter dispatch={dispatch} ready={ready} />
    </>
  );
}
