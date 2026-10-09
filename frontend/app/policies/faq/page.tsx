import type { Metadata } from "next";
import { FaqPage } from "@/pages/faq";
import "@/shared/styles/policies.css";
import "@/shared/styles/profile.css";
import "@/shared/styles/style.css";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    title: "Frequently Asked Questions - Genyxo",
    description:
      "Find answers to common questions about Genyxo, our AI models, credit system, billing, and privacy policies.",
    url: "https://genyxo.com/faq.html",
    siteName: "Genyxo",
    images: [
      {
        url: "https://genyxo.com/images/mainbanner2.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@genyxo",
    creator: "@genyxo_ai",
    title: "Frequently Asked Questions - Genyxo",
    description:
      "Find answers to common questions about Genyxo, our AI models, credit system, billing, and privacy policies.",
    images: ["https://genyxo.com/images/mainbanner2.png"],
  },
  title: "Frequently Asked Questions - Genyxo",
  description:
    "Find answers to common questions about Genyxo, our AI models, credit system, billing, and privacy policies.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://genyxo.com/policies/faq.html" },
};
export default function Page() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <FaqPage />
    </>
  );
}
