import type { Metadata, Viewport } from 'next';
import { PwaProvider } from '@/components/pwa/ServiceWorkerRegistrar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bill Book — Offline POS & UPI Receipt Generator',
  description:
    'Offline-first PWA point of sale, GST & discount billing, inventory manager, and instant UPI QR thermal receipts for local shopkeepers.',
  applicationName: 'Bill Book',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bill Book',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased selection:bg-emerald-500/25">
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
