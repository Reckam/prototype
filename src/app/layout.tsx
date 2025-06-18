import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: APP_NAME,
  description: `Manage your SACCO savings and loans with ${APP_NAME}.`,
  manifest: '/manifest.json',
  themeColor: '#4CAF50',
  icons: {
    icon: '/favicon.ico', // Standard path for favicon in the public folder
    apple: '/apple-touch-icon.png', // Optional: for Apple devices
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
