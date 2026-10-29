"use client";
import { useLayoutEffect } from "react";

export function DeviceIdentity() {
  useLayoutEffect(() => {
    if (/(?:^|;\s*)genyxo_device=/.test(document.cookie)) return;
    let id: string;
    try {
      id = localStorage.getItem("genyxo.device") || crypto.randomUUID();
      localStorage.setItem("genyxo.device", id);
    } catch {
      id = crypto.randomUUID();
    }
    document.cookie = `genyxo_device=${id}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }, []);
  return null;
}
