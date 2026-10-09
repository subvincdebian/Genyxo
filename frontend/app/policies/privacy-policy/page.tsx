import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/pages/privacy-policy";
import "@/shared/styles/policies.css";
import "@/shared/styles/profile.css";
import "@/shared/styles/style.css";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    title: "Privacy Policy - Genyxo",
    description: "Manage your account and subscriptions.",
    url: "https://genyxo.com/profile.html",
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
    title: "Privacy Policy - Genyxo",
    description: "Manage your Genyxo account settings and preferences.",
    images: ["https://genyxo.com/images/mainbanner2.png"],
  },
  title: "Privacy Policy - Genyxo",
  description:
    "Manage your Genyxo account settings, security options, billing history, and affiliate dashboard in one place.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://genyxo.com/policies/privacy-policy.html" },
};
export default function Page() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <PrivacyPolicyPage />
    </>
  );
}
