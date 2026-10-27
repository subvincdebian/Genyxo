import type { Metadata } from "next";
import { HomePage } from "@/pages/home";
import "@/shared/styles/style.css";
import "@/shared/styles/home-premium.css";
import "lenis/dist/lenis.css";
import { RouteScope } from "@/shared/ui/route-scope";

export const metadata: Metadata = {
  keywords: "AI chat, AI models, AI credits, Genyxo",
  openGraph: {
    type: "website",
    title: "Genyxo — Different AI models. One place to work.",
    description:
      "Choose an AI model for your next task in one chat with one credit balance.",
    url: "https://genyxo.com/",
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
    title: "Genyxo — Different AI models. One place to work.",
    description:
      "Choose an AI model for your next task in one chat with one credit balance.",
    images: ["https://genyxo.com/images/mainbanner2.png"],
  },
  title: "Genyxo — Different AI models. One place to work.",
  description:
    "Choose an AI model for your next task in one chat with one credit balance.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://genyxo.com/" },
};
export default function Page() {
  return (
    <RouteScope name="home">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Genyxo",
        url: "https://genyxo.com/",
        description: "Different AI models. One place to work.",
      }) }} />
      <HomePage />
    </RouteScope>
  );
}
