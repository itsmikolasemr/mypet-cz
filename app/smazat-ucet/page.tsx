import type { Metadata } from 'next';
import Link from 'next/link';

// Public web page required by Google Play (Data safety → "account deletion URL"). Static, no login needed.
export const metadata: Metadata = { title: 'Smazání účtu – Tlapka', description: 'Jak smazat účet Tlapka a související data.' };
const EMAIL = '[DOPLNIT: kontaktní e-mail, např. podpora@tlapka.cz]';
const NAME = '[DOPLNIT: obchodní firma / jméno podnikatele]';
const Ph = ({ children }: { children: React.ReactNode }) => <mark data-placeholder className="rounded px-1 bg-amber-100 text-amber-900">{children}</mark>;

export default function DeleteAccountPage() {
  return (
    <main className="max-w-xl mx-auto px-5 py-10 text-[15px] leading-relaxed text-ink">
      <h1 className="text-[26px] font-bold tracking-tight mb-1">Smazání účtu Tlapka</h1>
      <p className="text-muted mb-6">Aplikace Tlapka, provozovatel <Ph>{NAME}</Ph></p>
      <h2 className="font-bold text-lg mt-6 mb-2">Přímo v aplikaci (nejrychlejší)</h2>
      <ol className="list-decimal ml-5 space-y-1">
        <li>Otevři Tlapku a přejdi na <b>Nastavení</b>.</li>
        <li>Klepni na řádek <b>Účet a záloha</b>.</li>
        <li>Dole zvol <b>Smazat účet</b> a potvrď.</li>
      </ol>
      <p className="mt-2">Účet se smaže okamžitě.</p>
      <h2 className="font-bold text-lg mt-6 mb-2">Bez aplikace</h2>
      <p>Pošli e-mail z adresy, kterou používáš k přihlášení, na <Ph>{EMAIL}</Ph> s předmětem „Smazání účtu“. Smažeme ho do 30 dnů a potvrdíme ti to e-mailem.</p>
      <h2 className="font-bold text-lg mt-6 mb-2">Co se smaže</h2>
      <ul className="list-disc ml-5 space-y-1">
        <li>Účet a přihlašovací údaje.</li>
        <li>Domácnosti, které vlastníš, a v nich všichni mazlíčci, připomínky, návštěvy, léky, věrnostní karty i nahrané dokumenty a fotky.</li>
        <li>Tvoje členství v domácnostech jiných lidí (jejich data zůstanou jim).</li>
      </ul>
      <h2 className="font-bold text-lg mt-6 mb-2">Co zůstává</h2>
      <ul className="list-disc ml-5 space-y-1">
        <li>Data uložená jen v telefonu (bez přihlášení) – smažeš je odinstalováním aplikace nebo v Nastavení → Smazat všechna data.</li>
        <li>Záznamy o platbách vede Apple / Google podle svých pravidel. Předplatné zruš v nastavení App Store / Google Play – smazáním účtu se samo nezruší.</li>
        <li>Účetní doklady, které ze zákona musíme uchovávat (až 10 let).</li>
      </ul>
      <p className="mt-8 text-sm text-muted">Více v <Link className="underline" href="/#privacy">Zásadách ochrany osobních údajů</Link>.</p>
    </main>
  );
}
