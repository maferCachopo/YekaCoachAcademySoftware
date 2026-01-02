import React from 'react';
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from './providers';
import Script from 'next/script';
import ClientLayout from './ClientLayout';
import NextjsLogoCleaner from './components/NextjsLogoCleaner';
import ThemeRegistry from './components/ThemeRegistry'; // Importamos el Registry

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
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function removeNextjsElements() {
              var selectors = [
                '#__next-build-watcher',
                '[data-nextjs-dialog-overlay]',
                '[data-nextjs-dialog]',
                '[data-nextjs-toast]',
                '.nextjs-container',
                'div[style*="position: fixed"][style*="bottom: 0"][style*="left: 0"]',
                'div[style*="position: fixed"][style*="bottom: 0"][style*="right: 0"]'
              ];
              
              selectors.forEach(function(selector) {
                try {
                  var elements = document.querySelectorAll(selector);
                  for (var i = 0; i < elements.length; i++) {
                    if (elements[i] && elements[i].parentNode) {
                      elements[i].parentNode.removeChild(elements[i]);
                    }
                  }
                } catch (e) {}
              });
            }
            
            // Run immediately
            removeNextjsElements();
            
            // Also run after DOM is loaded
            document.addEventListener('DOMContentLoaded', removeNextjsElements);
            
            // And run periodically to catch any dynamically added elements
            setInterval(removeNextjsElements, 1000);
          })();
        `}} />
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
      {/* Agregamos suppressHydrationWarning para ignorar atributos de extensiones */}
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning={true}>
        <ThemeRegistry>
          <Providers>
            <ClientLayout>{children}</ClientLayout>
            <NextjsLogoCleaner />
          </Providers>
        </ThemeRegistry>
      </body>
    </html>
  );
}