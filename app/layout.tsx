import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MyPet CZ — Zdravotní záznamy mazlíčků',
  description: 'Česká aplikace pro správu zdravotních záznamů, připomínek a dokumentů vašich mazlíčků.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="min-h-screen antialiased">
        <header className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#2E7D6F] flex items-center justify-center text-white text-sm font-bold">M</div>
            <span className="font-semibold text-lg">MyPet CZ</span>
          </div>
        </header>
        <main className="max-w-md mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
