import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const backend = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:3000"
).replace(/\/$/, "");
const legacyPages = [
  "chat",
  "profile",
  "notifications",
  "support",
  "dashboard",
];
const policyPages = ["policies", "privacy-policy", "terms-of-service", "faq"];
const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  compress: false,
  experimental: { proxyTimeout: 120_000 },
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
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
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
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/index.html", destination: "/" },
        ...legacyPages.map((page) => ({
          source: `/${page}.html`,
          destination: `/${page}`,
        })),
        ...policyPages.flatMap((page) => [
          {
            source: `/policies/${page}.html`,
            destination: `/policies/${page}`,
          },
          { source: `/${page}.html`, destination: `/policies/${page}` },
        ]),
        { source: "/gate.html", destination: "/admin" },
        { source: "/admin.html", destination: "/admin" },
        {
          source: "/are-you-sure-you-want-to-admin/panel",
          destination: "/admin",
        },
        { source: "/api/:path*", destination: `${backend}/:path*` },
        { source: "/auth/:path*", destination: `${backend}/auth/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};
export default bundleAnalyzer(config);
