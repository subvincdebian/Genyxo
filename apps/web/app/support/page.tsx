import type { Metadata } from "next";
import { SupportPage } from "@/pages/support";
import "@/shared/styles/profile.css";
import "@/pages/support/ui/page.css";

export const metadata: Metadata = {
  title: "Support Center - Genyxo",
  description:
    "Discover a new level with our service - subscriptions to AI, social networks, and more. Convenient access to modern tools that open up limitless opportunities for your development and business.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://genyxo.com/support.html" },
};
export default function Page() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <SupportPage />
    </>
  );
}
