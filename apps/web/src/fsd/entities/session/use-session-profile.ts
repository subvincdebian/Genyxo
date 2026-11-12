"use client";
import { useSyncExternalStore } from "react";

export type SessionProfile = {
  name: string;
  email: string;
  avatar: string;
  credits: string;
  role?: string;
} | null;

let cachedKey = "";
let cachedProfile: SessionProfile = null;
function read(): SessionProfile {
  try {
    if (!localStorage.getItem("authToken")) return null;
    const name = localStorage.getItem("userName") || "";
    const email = localStorage.getItem("userEmail") || "";
    const avatar = localStorage.getItem("userAvatar") || "";
    const credits = localStorage.getItem("userCredits") || "";
    const role = localStorage.getItem("userRole") || "";
    const key = [name, email, avatar, credits, role].join("\u0000");
    // useSyncExternalStore needs a stable snapshot between unchanged reads.
    if (key !== cachedKey || !cachedProfile) {
      cachedKey = key;
      cachedProfile = {
        name: name || email.split("@")[0] || "",
        email,
        avatar,
        credits,
        role,
      };
    }
    return cachedProfile;
  } catch {
    return null;
  }
}
function subscribe(callback: () => void) {
  document.addEventListener("genyxo:session", callback);
  document.addEventListener("genyxo:credits", callback);
  window.addEventListener("storage", callback);
  return () => {
    document.removeEventListener("genyxo:session", callback);
    document.removeEventListener("genyxo:credits", callback);
    window.removeEventListener("storage", callback);
  };
}
/** Display-only session details cached by the legacy chat controller. */
export function useSessionProfile() {
  return useSyncExternalStore(subscribe, read, () => null);
}
