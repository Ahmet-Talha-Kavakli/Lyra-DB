import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lyra — AI Therapy',
  description:
    'A new kind of therapeutic experience. Always available, deeply personal, and built with care.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable:      true,
    statusBarStyle: 'black-translucent',
    title:        'Lyra',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.className} h-full antialiased`}>
        <head>
          <meta name="theme-color" content="#030712" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body className="min-h-full bg-gray-950 text-white">{children}</body>
      </html>
    </ClerkProvider>
  );
}
