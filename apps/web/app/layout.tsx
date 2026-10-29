import type { ReactNode } from "react";
import type { Viewport } from "next";
import { LanguageProvider } from "@/shared/i18n";
import { AppearanceSync } from "@/shared/ui/AppearanceSync";
import "@/shared/styles/tailwind.css";
import "@/shared/styles/theme.css";
import "@/shared/styles/avatar.css";
import "@/shared/ui/appearance.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/logo.svg" type="image/svg+xml" />
      </head>
      <body>
        <LanguageProvider>
          <AppearanceSync />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
