import type { Metadata } from "next";

// The workspace layout renders the conversation; the key in the URL is
// resolved client-side and only for the chat's owner.
export const metadata: Metadata = {
  title: "Genyxo Chat — Your AI workspace",
  robots: { index: false, follow: false },
};

export default function Page() {
  return null;
}
