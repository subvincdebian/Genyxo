"use client";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { clearAppearance } from "@/shared/lib/appearance";
import { paintSiteAppearance, syncSiteTheme } from "@/shared/lib/theme";
export function AppearanceSync() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const sync = () => syncSiteTheme();
    sync();
    const observer = new MutationObserver(paintSiteAppearance);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    document.addEventListener("genyxo:appearance", sync);
    document.addEventListener("genyxo:theme", sync);
    document.addEventListener("genyxo:workspace-theme", sync);
    window.addEventListener("storage", sync);
    const system = matchMedia("(prefers-color-scheme: dark)");
    system.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("genyxo:appearance", sync);
      document.removeEventListener("genyxo:theme", sync);
      document.removeEventListener("genyxo:workspace-theme", sync);
      window.removeEventListener("storage", sync);
      system.removeEventListener("change", sync);
      clearAppearance();
    };
  }, [pathname]);
  return null;
}
