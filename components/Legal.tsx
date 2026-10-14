'use client';
// Zásady ochrany osobních údajů, Podmínky užívání, O aplikaci. Provozovatel z ARES (14. 10. 2026); e-maily jsou ZÁSTUPNÉ – před vydáním doplnit (hledej „[DOPLNIT“).
import { PageHeader, Card, Logo } from './ui';

export const COMPANY = {
  name: 'ABEGRIN s.r.o.', ico: '29262585', dic: 'CZ29262585', address: 'Králova 279/9, Žabovřesky, 616 00 Brno', register: 'C 69118 vedená u Krajského soudu v Brně',
  email: '[DOPLNIT: kontaktní e-mail, např. podpora@tlapka.cz]', dpo: '[DOPLNIT: e-mail pro ochranu osobních údajů]',
};
export const LEGAL_UPDATED = '14. 10. 2026';
const Ph = ({ children }: { children: React.ReactNode }) => <mark className="rounded px-1 bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100" data-placeholder>{children}</mark>;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="font-bold text-[16px] mt-6 mb-2">{children}</h2>;
const Doc = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <article className="text-[14px] leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2">
    <PageHeader title={title} sub={`Platné od ${LEGAL_UPDATED}`} />
    <Card className="p-4 mb-4 text-[13px]" ><p><b>Návrh dokumentu.</b> Údaje označené žlutě je nutné před vydáním doplnit a text nechat zkontrolovat právníkem.</p></Card>
    {children}
  </article>
);
const Op = () => <p>Provozovatel: {COMPANY.name}, IČO {COMPANY.ico}, DIČ {COMPANY.dic}, sídlo {COMPANY.address}, zapsaná v obchodním rejstříku, spisová značka {COMPANY.register}, e-mail <Ph>{COMPANY.email}</Ph>.</p>;

export function Privacy() {
  return (
    <Doc title="Ochrana osobních údajů">
      <Op />
      <H>1. Jaké údaje zpracováváme</H>
      <ul>
        <li><b>Bez účtu:</b> údaje o mazlíčcích, připomínky, návštěvy, léky, alergie, dokumenty a věrnostní karty zůstávají jen v tvém zařízení. Nic neodesíláme.</li>
        <li><b>S účtem (volitelné):</b> e-mail, jméno z přihlášení přes Apple/Google/Facebook a data appky pro zálohu a sdílení s domácností. Ukládáme je u Supabase v EU (Frankfurt).</li>
        <li><b>Aivet a AI sken:</b> text dotazu, profil mazlíčka (druh, věk, váha, léky, alergie) a případně fotka dokladu se odešlou poskytovateli AI (Google Gemini) jen kvůli odpovědi. Neukládáme je k tvému účtu a nejsou použity k trénování.</li>
        <li><b>Poloha:</b> jen na zařízení pro mapu veterin, výběhů a zverimexů. Na server ji neposíláme (výjimkou je záložní vyhledání klinik se zaokrouhlenou polohou ~1 km).</li>
        <li><b>Předplatné:</b> stav předplatného od Apple/Google (přes RevenueCat). Platební údaje nevidíme.</li>
        <li><b>Reklama (verze zdarma):</b> pokud bude zapnutá, reklamní partner (Google AdMob) může použít reklamní identifikátor – na iPhonu jen s tvým souhlasem (App Tracking Transparency), jinak se zobrazují nepersonalizované reklamy.</li>
      </ul>
      <H>2. Proč a na jakém základě</H>
      <p>Plnění smlouvy (fungování appky, záloha, předplatné), oprávněný zájem (bezpečnost, prevence zneužití – omezení počtu dotazů) a souhlas (personalizovaná reklama, oznámení). Údaje o zdraví zvířat nejsou zvláštní kategorií osobních údajů, chráníme je ale stejně pečlivě.</p>
      <H>3. Jak dlouho</H>
      <p>Data v účtu do jeho smazání. Smazané položky v koši 30 dní. Záznamy o dotazech Aivetovi (bez obsahu) nejvýše 30 dní kvůli limitům.</p>
      <H>4. Příjemci</H>
      <p>Supabase (hosting databáze, EU), Netlify (hosting webu a funkcí), Google (Gemini, AdMob), RevenueCat, Apple a Google (platby). S nikým jiným data nesdílíme a neprodáváme je.</p>
      <H>5. Tvoje práva</H>
      <p>Máš právo na přístup, opravu, výmaz, omezení, přenositelnost (export v Nastavení › Data) a námitku. Účet smažeš sám v Nastavení › Účet › Smazat účet. Souhlas můžeš kdykoli odvolat. Stížnost můžeš podat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).</p>
      <p>Kontakt pro ochranu osobních údajů: <Ph>{COMPANY.dpo}</Ph>.</p>
    </Doc>
  );
}

export function Terms() {
  return (
    <Doc title="Podmínky užívání">
      <Op />
      <H>1. Co Tlapka je</H>
      <p>Pomocník pro péči o domácí zvířata: připomínky, zdravotní deník, mapa, věrnostní karty a AI rádce Aivet. <b>Tlapka ani Aivet nejsou zdravotnický prostředek a nenahrazují veterináře.</b> V nouzi vždy volej veterinární pohotovost.</p>
      <H>2. Verze zdarma a Premium</H>
      <ul>
        <li>Premium: 99 Kč měsíčně (první měsíc 49 Kč), 699 Kč ročně, Rodina 999 Kč ročně (až 6 lidí v domácnosti). Ceny včetně DPH.</li>
        <li>Zakládající Tlapkař: po dobu 3 měsíců od spuštění v obchodech lze sjednat roční předplatné za 499 Kč. Tato cena platí pro každé další obnovení, dokud předplatné nepřerušíš nebo nezrušíš; po zrušení a novém sjednání platí aktuální ceník.</li>
        <li>Zkušební období 14 dní zdarma; pokud ho nezrušíš nejméně 24 hodin před koncem, změní se na placené předplatné.</li>
        <li>Předplatné se automaticky obnovuje, dokud ho nezrušíš v nastavení App Store / Google Play (nejpozději 24 h před koncem období). Platba se strhne z účtu Apple/Google.</li>
        <li>Obnovení nákupu na novém zařízení: Nastavení › Předplatné › Obnovit nákupy.</li>
        <li>Vrácení peněz řeší Apple či Google podle svých pravidel.</li>
      </ul>
      <H>3. Tvůj obsah</H>
      <p>Data, která zadáš, patří tobě. Zálohu si můžeš kdykoli exportovat. Neodpovídáme za ztrátu dat uložených jen v zařízení bez zálohy.</p>
      <H>4. Data třetích stran</H>
      <p>Mapa používá data OpenStreetMap (© přispěvatelé OpenStreetMap, licence ODbL). Mohou být neúplná nebo neaktuální. Otevírací doby si ověř u provozovny.</p>
      <H>5. Odpovědnost</H>
      <p>Appku poskytujeme „tak, jak je“. Za rozhodnutí o zdraví zvířete odpovídá majitel a veterinář. Odpovědnost provozovatele je omezena v rozsahu, který připouští zákon.</p>
      <H>6. Spotřebitelské spory</H>
      <p>Mimosoudní řešení: Česká obchodní inspekce (coi.cz). Rozhodným právem je právo České republiky.</p>
    </Doc>
  );
}

export function About({ open }: { open: (t: 'privacy' | 'terms') => void }) {
  return (
    <div>
      <PageHeader title="O aplikaci" />
      <div className="text-center mb-5"><Logo animate className="h-14 mx-auto" /><p className="text-muted text-sm mt-2">Verze 1.2 · vyrobeno v Česku s láskou k tlapkám</p></div>
      <Card className="divide-y divide-ink/5 dark:divide-white/5">
        {([['privacy', 'Ochrana osobních údajů'], ['terms', 'Podmínky užívání']] as const).map(([k, l]) => <button key={k} onClick={() => open(k)} className="press w-full text-left px-4 min-h-[52px] font-medium flex items-center justify-between">{l}<span aria-hidden className="text-muted">›</span></button>)}
        <a className="block px-4 py-3.5 font-medium" href={`mailto:${COMPANY.email.startsWith('[') ? 'podpora@example.com' : COMPANY.email}?subject=Tlapka%20–%20zpětná%20vazba`}>Napsat nám <span className="block text-[13px] text-muted"><Ph>{COMPANY.email}</Ph></span></a>
      </Card>
      <Card className="p-4 mt-4 text-[13px] text-muted space-y-1.5">
        <p>Mapové podklady a data o veterinách, výbězích a zverimexech: © přispěvatelé <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (ODbL).</p>
        <p>Aivet využívá model Google Gemini. Odpovědi jsou orientační a nenahrazují vyšetření.</p>
        <p>Písmo Manrope (SIL Open Font License). Knihovny: Next.js, React, Leaflet, pdf-lib, ZXing, Capacitor.</p>
        <p>Tlapka není zdravotnický prostředek.</p>
      </Card>
    </div>
  );
}
