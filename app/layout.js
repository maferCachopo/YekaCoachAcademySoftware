import React from 'react';
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from './providers';
import Script from 'next/script';
import ClientLayout from './ClientLayout';
//import NextjsLogoCleaner from './components/NextjsLogoCleaner';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "YekaCoach Academy",
  description: "Language Academy Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Inline script to remove Next.js logo ASAP */}

      </head>
      <Script 
        id="theme-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              if (typeof window !== 'undefined') {
                const themeMode = localStorage.getItem('yekacoachacademy_theme_mode');
                if (themeMode === 'light' || themeMode === 'dark') {
                  document.documentElement.dataset.theme = themeMode;
                }
              }
            } catch (err) { 
              console.error('Theme initialization error:', err);
            }
          })();
        `}}
      />
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
         
        </Providers>
      </body>
    </html>
  );
}

