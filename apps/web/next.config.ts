import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const legacyPages = [
  "chat",
  "profile",
  "notifications",
  "support",
  "dashboard",
];
const policyPages = ["policies", "privacy-policy", "terms-of-service", "faq"];
const config: NextConfig = {
  distDir: process.env.GENYXO_NEXT_DIST_DIR || ".next",
  devIndicators: false,
  output: "standalone",
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  compress: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "connect-src 'self' ws: wss: http: https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
        { source: "/index.html", destination: "/", permanent: true },
        ...legacyPages.map((page) => ({
          source: `/${page}.html`,
          destination: `/${page}`,
          permanent: true,
        })),
        ...policyPages.flatMap((page) => [
          {
            source: `/policies/${page}.html`,
            destination: `/policies/${page}`,
            permanent: true,
          },
          { source: `/${page}.html`, destination: `/policies/${page}`, permanent: true },
        ]),
        { source: "/gate.html", destination: "/admin", permanent: true },
        { source: "/admin.html", destination: "/admin", permanent: true },
        {
          source: "/are-you-sure-you-want-to-admin/panel",
          destination: "/admin",
          permanent: true,
        },
      ];
  },
};
export default bundleAnalyzer(config);
