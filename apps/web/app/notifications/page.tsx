import type { Metadata } from "next";
import { NotificationsPage } from "@/pages/notifications";
import "@/shared/styles/profile.css";
import "@/pages/notifications/ui/page.css";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    title: "Your Notifications - Genyxo AI",
    description: "Check your latest updates and support replies on Genyxo.",
    url: "https://genyxo.com/notifications.html",
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
    creator: "@genyxo_ai",
    title: "Your Notifications - Genyxo AI",
    description: "Check your latest updates and support replies on Genyxo.",
    images: ["https://genyxo.com/images/mainbanner2.png"],
  },
  title: "Notifications - Genyxo",
  description:
    "Stay updated with Genyxo. Track your support tickets, subscription changes, and AI service notifications in one place.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://genyxo.com/notifications.html" },
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
            '\n    {\n      "@context": "https://schema.org",\n      "@type": "BreadcrumbList",\n      "itemListElement": [{\n        "@type": "ListItem",\n        "position": 1,\n        "name": "Home",\n        "item": "https://genyxo.com/index.html"\n      },{\n        "@type": "ListItem",\n        "position": 2,\n        "name": "Notifications",\n        "item": "https://genyxo.com/notifications.html"\n      }]\n    }\n    ',
        }}
      />
      <NotificationsPage />
    </>
  );
}
