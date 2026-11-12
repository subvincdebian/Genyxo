import type { Metadata } from "next";
import { ProfilePage } from "@/pages/profile";

export const metadata: Metadata = {
  title: "Account Settings & Profile - Genyxo",
  description:
    "Your profile, preferences, security and credit activity in one place.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://genyxo.com/profile" },
};

export default function Page() {
  return (
    <>
      <ProfilePage />
    </>
  );
}
