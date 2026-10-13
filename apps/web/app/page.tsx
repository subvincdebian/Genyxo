import type { Metadata } from "next";
import { HomePage } from "@/pages/home";
import "@/shared/styles/style.css";

export const metadata: Metadata = {
  keywords: "AI, neural networks, subscriptions, GPT-4, Gemini, Sora, AI tools",
  openGraph: {
    type: "website",
    title: "Genyxo AI — Unlock the Power of Neural Networks",
    description:
      "Access premium AI tools, generate visuals, and automate your workflow with our next-gen platform.",
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
    site: "@genyxo",
    creator: "@genyxo_ai",
    title: "Genyxo AI — Unlock the Power of Neural Networks",
    description:
      "Access premium AI tools and generate visuals with our next-gen platform.",
    images: ["https://genyxo.com/images/mainbanner2.png"],
  },
  title: "Prepare for Future With - Genyxo",
  description:
    "Get premium access to AI tools, neural networks, and social media services. Automate your workflow and unlock limitless opportunities with Genyxo AI.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://genyxo.com/" },
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
            '\n    {\n      "@context": "https://schema.org",\n      "@graph": [\n        {\n            "@type": "WebPage",\n            "@id": "https://genyxo.com/chat.html#webpage",\n            "url": "https://genyxo.com/chat.html",\n            "name": "Genyxo AI Chat - Intelligent assistant",\n            "description": "Access all top neural networks in one place. Try Genyxo AI!"\n        },\n        {\n          "@type": "WebSite",\n          "@id": "https://genyxo.com/#website",\n          "url": "https://genyxo.com/",\n          "name": "Genyxo AI",\n          "description": "Premium AI Subscriptions and Tools",\n          "publisher": { "@id": "https://genyxo.com/#organization" },\n          "potentialAction": {\n            "@type": "SearchAction",\n            "target": {\n              "@type": "EntryPoint",\n              "urlTemplate": "https://genyxo.com/chat.html?q={search_term_string}"\n            },\n            "query-input": {\n              "@type": "PropertyValueSpecification",\n              "valueRequired": true,\n              "valueName": "search_term_string"\n            }\n          }\n        },\n        {\n          "@type": "Organization",\n          "@id": "https://genyxo.com/#organization",\n          "name": "Genyxo",\n          "url": "https://genyxo.com/",\n          "logo": {\n            "@type": "ImageObject",\n            "url": "https://genyxo.com/images/logo.svg",\n            "width": "192",\n            "height": "192"\n          },\n          "image": { "@id": "https://genyxo.com/images/logo.svg" },\n          "contactPoint": {\n            "@type": "ContactPoint",\n            "email": "info@genyxo.com",\n            "contactType": "customer service"\n          }\n        },\n        {\n          "@type": "BreadcrumbList",\n          "@id": "https://genyxo.com/#breadcrumb",\n          "itemListElement": [{\n            "@type": "ListItem",\n            "position": 1,\n            "name": "Home",\n            "item": "https://genyxo.com/"\n          }]\n        }\n      ]\n    }\n    ',
        }}
      />
      <HomePage />
    </>
  );
}
