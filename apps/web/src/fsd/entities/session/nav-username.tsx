"use client";
import { useSyncExternalStore, type HTMLAttributes } from "react";
import { useLanguage } from "@/shared/i18n";
function readName() {
  try {
    return localStorage.getItem("authToken")
      ? localStorage.getItem("userName") ||
          localStorage.getItem("userEmail") ||
          "User"
      : null;
  } catch {
    return null;
  }
}
function subscribe(callback: () => void) {
  document.addEventListener("genyxo:session", callback);
  window.addEventListener("storage", callback);
  return () => {
    document.removeEventListener("genyxo:session", callback);
    window.removeEventListener("storage", callback);
  };
}
export function NavUsername(props: HTMLAttributes<HTMLSpanElement>) {
  const name = useSyncExternalStore(subscribe, readName, () => null);
  const { t } = useLanguage();
  return <span {...props}>{name || t("nav.login", "Register / Login")}</span>;
}
