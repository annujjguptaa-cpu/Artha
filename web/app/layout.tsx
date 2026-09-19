import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Artha — AI-Agentic Grocery Price Comparison & Auto-Cart',
  description: 'Smart multi-platform price comparison & automated split-cart execution for Zepto, Blinkit, and Swiggy Instamart.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#00A896',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-teal-500/30 selection:text-teal-200">
        <Navbar />
        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </body>
    </html>
  );
}
