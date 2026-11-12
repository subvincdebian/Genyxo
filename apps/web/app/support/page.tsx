import type { Metadata } from "next";
import { SupportPage } from "@/pages/support";

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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Inter+Tight:wght@500..700&display=swap"
        precedence="default"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <SupportPage />
    </>
  );
}
