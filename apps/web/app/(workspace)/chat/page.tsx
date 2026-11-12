import type { Metadata } from "next";

export const metadata: Metadata = {
  keywords: "AI chat, AI models, Genyxo workspace",
  openGraph: {
    type: "website",
    title: "Genyxo Chat — Your AI workspace",
    description: "Choose a model and work in one AI chat with one credit balance.",
    url: "https://genyxo.com/chat",
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
    title: "Genyxo Chat — Your AI workspace",
    description: "Choose a model and work in one AI chat with one credit balance.",
    images: ["https://genyxo.com/images/mainbanner2.png"],
  },
  title: "Genyxo Chat — Your AI workspace",
  description:
    "Choose a model and work in one AI chat with one credit balance.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://genyxo.com/chat" },
};
export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            '\n    {\n        "@context": "https://schema.org",\n        "@graph": [\n            {\n                "@type": "WebPage",\n                "@id": "https://genyxo.com/chat#webpage",\n                "url": "https://genyxo.com/chat",\n                "name": "Genyxo AI Chat - Intelligent assistant",\n                "description": "Access all top neural networks in one place. Try Genyxo AI!"\n            },\n            {\n                "@type": "Organization",\n                "@id": "https://genyxo.com/#organization",\n                "name": "Genyxo",\n                "url": "https://genyxo.com/",\n                "logo": {\n                    "@type": "ImageObject",\n                    "url": "https://genyxo.com/images/logo.svg",\n                    "width": "192",\n                    "height": "192"\n                },\n                "image": { "@id": "https://genyxo.com/images/logo.svg" },\n                "contactPoint": {\n                    "@type": "ContactPoint",\n                    "email": "info@genyxo.com",\n                    "contactType": "customer service"\n                }\n            },\n            {\n                "@type": "WebSite",\n                "@id": "https://genyxo.com/#website",\n                "url": "https://genyxo.com/",\n                "name": "Genyxo AI",\n                "publisher": { "@id": "https://genyxo.com/#organization" },\n                "potentialAction": {\n                    "@type": "SearchAction",\n                    "target": {\n                        "@type": "EntryPoint",\n                        "urlTemplate": "https://genyxo.com/chat?q={search_term_string}"\n                    },\n                    "query-input": {\n                        "@type": "PropertyValueSpecification",\n                        "valueRequired": true,\n                        "valueName": "search_term_string"\n                    }\n                }\n            },\n            {\n                "@type": "BreadcrumbList",\n                "@id": "https://genyxo.com/chat#breadcrumb",\n                "itemListElement": [\n                    {\n                        "@type": "ListItem",\n                        "position": 1,\n                        "name": "Home",\n                        "item": "https://genyxo.com/"\n                    },\n                    {\n                        "@type": "ListItem",\n                        "position": 2,\n                        "name": "AI Chat",\n                        "item": "https://genyxo.com/chat"\n                    }\n                ]\n            }\n        ]\n    }\n    ',
        }}
      />
    </>
  );
}
