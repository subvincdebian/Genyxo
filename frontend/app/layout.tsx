import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { LanguageProvider } from '@/features/language';
import '@/shared/styles/tailwind.css';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, interactiveWidget: 'resizes-content' };
export default function RootLayout({children}: {children:ReactNode}) {
  return <html lang="en"><head><link rel="icon" href="/images/logo.svg" type="image/svg+xml"/></head><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
