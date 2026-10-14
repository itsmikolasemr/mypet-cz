import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';

const font = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font', display: 'swap' });

export const metadata: Metadata = {
  title: 'Tlapka – péče o mazlíčky',
  description: 'Připomínky odčervení a očkování, zdravotní deník, váha a dokumenty tvých mazlíčků.',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.png', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Tlapka', statusBarStyle: 'default' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#E4E5E8' };

const noFlash = `try{var h=document.head;for(var i=h.childNodes.length-1;i>=0;i--){var x=h.childNodes[i];if((x.nodeType===3&&!x.textContent.trim())||(x.nodeType===8&&/netlify/i.test(x.textContent)))h.removeChild(x)}}catch(e){}try{var d=JSON.parse(localStorage.getItem('tlapka:data:v1')||'{}');var t=(d.settings&&d.settings.theme)||'system';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');if(t==='glass')document.documentElement.classList.add('glass')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={font.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: noFlash }} /></head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
