"use client";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  SupportNavbar,
  SupportSupportContainer,
  SupportFaqWindow,
  SupportLangModal,
} from "@/widgets/support";
import styles from "./SupportPage.module.css";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function SupportPage() {
  useLocalizedMetadata("support.page_title", undefined);
  const { dispatch, ready } = useController(loadController);
  return (
    <div className={styles.page}>
      <SupportNavbar dispatch={dispatch} ready={ready} />
      <SupportSupportContainer dispatch={dispatch} ready={ready} />
      <SupportFaqWindow dispatch={dispatch} ready={ready} />
      <SupportLangModal dispatch={dispatch} ready={ready} />
    </div>
  );
}
