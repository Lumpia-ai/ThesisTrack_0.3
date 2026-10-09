import type { Metadata } from 'next';
import { Inter, Playfair_Display, Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import { LogoutFlow } from '@/components/auth/logout-flow';
import { SessionSuspensionWatcher } from '@/components/auth/session-suspension-watcher';
import { BrandingProvider } from '@/components/branding/branding-provider';
import { SYSTEM_LOGO_SRC } from '@/lib/branding';
import './globals.css';
import '../styles/portal-shell-menus.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: false
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  preload: false
});

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-student',
  preload: false
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-adviser',
  preload: false
});

export const metadata: Metadata = {
  title: 'ThesisTrack',
  description: 'Higher Education Institutions',
  icons: {
    icon: SYSTEM_LOGO_SRC
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${playfairDisplay.variable} ${poppins.variable} ${plusJakartaSans.variable}`} lang="en" data-scroll-behavior="smooth">
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="darkreader-lock" content="true" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body suppressHydrationWarning>
        <BrandingProvider>
          {children}
          <SessionSuspensionWatcher />
          <LogoutFlow />
        </BrandingProvider>
      </body>
    </html>
  );
}
