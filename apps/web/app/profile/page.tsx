import type { Metadata } from "next";
import { ProfilePage } from "@/pages/profile";
import "@/shared/styles/profile.css";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    title: "My Profile - Genyxo",
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
    title: "My Profile - Genyxo",
    description: "Manage your Genyxo account settings and preferences.",
    images: ["https://genyxo.com/images/mainbanner2.png"],
  },
  title: "Account Settings & Profile - Genyxo",
  description:
    "Manage your Genyxo account settings, security options, billing history, and affiliate dashboard in one place.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://genyxo.com/profile.html" },
};
export default function Page() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            '\n    {\n      "@context": "https://schema.org",\n      "@graph": [\n        {\n            "@type": "WebPage",\n            "@id": "https://genyxo.com/profile.html#webpage",\n            "url": "https://genyxo.com/profile.html",\n            "name": "User Profile - Genyxo AI",\n            "description": "Manage your Genyxo AI account settings, subscriptions, and affiliate dashboard.",\n            "isPartOf": { "@id": "https://genyxo.com/#website" },\n            "breadcrumb": { "@id": "https://genyxo.com/profile.html#breadcrumb" }\n        },\n        {\n          "@type": "WebSite",\n          "@id": "https://genyxo.com/#website",\n          "url": "https://genyxo.com/",\n          "name": "Genyxo AI",\n          "description": "Premium AI Subscriptions and Tools",\n          "publisher": { "@id": "https://genyxo.com/#organization" }\n        },\n        {\n          "@type": "Organization",\n          "@id": "https://genyxo.com/#organization",\n          "name": "Genyxo",\n          "url": "https://genyxo.com/",\n          "logo": {\n            "@type": "ImageObject",\n            "url": "https://genyxo.com/images/logo.svg",\n            "width": "192",\n            "height": "192"\n          },\n          "contactPoint": {\n            "@type": "ContactPoint",\n            "email": "info@genyxo.com",\n            "contactType": "customer service"\n          }\n        },\n        {\n          "@type": "BreadcrumbList",\n          "@id": "https://genyxo.com/profile.html#breadcrumb",\n          "itemListElement": [\n            {\n              "@type": "ListItem",\n              "position": 1,\n              "name": "Home",\n              "item": "https://genyxo.com/"\n            },\n            {\n              "@type": "ListItem",\n              "position": 2,\n              "name": "My Profile",\n              "item": "https://genyxo.com/profile.html"\n            }\n          ]\n        }\n      ]\n    }\n    ',
        }}
      />
      <ProfilePage />
    </>
  );
}
