'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Chips, Segment } from '../felles';

type Type = 'horing' | 'horingsfrist' | 'innstilling' | 'salen' | 'budsjett';
interface Hendelse { dato: string; type: Type; tittel: string; url?: string; detalj?: string; komite?: string; omtrentlig?: boolean }

const TYPER: { id: Type; navn: string }[] = [
  { id: 'horing', navn: 'Høringer' },
  { id: 'horingsfrist', navn: 'Høringsfrister' },
  { id: 'innstilling', navn: 'Frist for innstilling' },
  { id: 'salen', navn: 'Debatt i salen' },
  { id: 'budsjett', navn: 'Budsjettåret' },
];
const TYPE_NAVN: Record<Type, string> = { horing: 'Høring', horingsfrist: 'Høringsfrist', innstilling: 'Frist for innstilling', salen: 'Debatt i salen', budsjett: 'Budsjettåret' };

// Budsjettåret slik det er beskrevet i WA Helses Access-modell. Datoene er omtrentlige og varierer noe fra år til år.
function budsjettaret(aar: number): Hendelse[] {
  const h = (mnd: number, dag: number, tittel: string, detalj: string): Hendelse =>
    ({ dato: `${aar}-${String(mnd).padStart(2, '0')}-${String(dag).padStart(2, '0')}`, type: 'budsjett', tittel, detalj, omtrentlig: true });
  return [
    h(1, 15, 'Satsingsforslag: HOD melder inn behov til Finansdepartementet', 'Innspill til regjeringen fra november til mars'),
    h(3, 20, 'Regjeringens budsjettkonferanse: rammene for neste år settes', 'Siste sjanse til å påvirke rammene'),
    h(5, 12, 'Revidert nasjonalbudsjett (RNB) legges fram', 'Ment for uforutsette behov, unntaket og ikke regelen'),
    h(6, 19, 'RNB vedtas: andre sjanse', ''),
    h(8, 25, 'Augustkonferansen: budsjettet lukkes', ''),
    h(10, 7, 'Prop. 1 S: statsbudsjettet legges fram', 'Start her: arbeidet med neste års budsjett starter allerede på senhøsten'),
    h(10, 20, 'Budsjetthøringer i komiteene', 'Innspill og komitéhøring'),
    h(11, 20, 'Partienes alternative budsjetter og budsjettforlik', ''),
    h(12, 10, 'Finansdebatt og vedtak av statsbudsjettet', ''),
  ];
}

export function Kalender() {
  const { data } = useData();
  const [typer, setTyper] = useState<Type[]>([]);
  const [omfang, setOmfang] = useState<'komite' | 'alle'>('komite');
  const [passerte, setPasserte] = useState(false);

  const hendelser = useMemo(() => {
    const ut: Hendelse[] = [];
    const iOmfang = (komite?: string) => omfang === 'alle' || komite === data.komite.id;
    for (const e of data.elementer) {
      if (e.type === 'horing' && iOmfang(e.komite)) {
        for (const t of e.tider || []) ut.push({ dato: t.tid, type: 'horing', tittel: e.tittel, url: e.url, detalj: t.sted, komite: e.komite });
        if (e.frist) ut.push({ dato: e.frist, type: 'horingsfrist', tittel: e.tittel, url: e.url, detalj: e.skriftlig ? 'Frist for skriftlige innspill' : 'Frist for å melde seg på', komite: e.komite });
      }
      if (e.type === 'sak' && e.frister && iOmfang(e.komite)) {
        if (e.frister.avgivelsesfrist) ut.push({ dato: e.frister.avgivelsesfrist, type: 'innstilling', tittel: e.tittel, url: e.url, detalj: `${e.henvisning || ''} · komiteen skal avgi innstilling`, komite: e.komite });
        if (e.frister.horingsfrist && !data.elementer.some((h) => h.type === 'horing' && h.saker?.includes(Number(e.id.replace('sak-', ''))))) {
          ut.push({ dato: e.frister.horingsfrist, type: 'horingsfrist', tittel: e.tittel, url: e.url, detalj: 'Høringsfrist', komite: e.komite });
        }
      }
    }
    for (const s of data.kalender?.salen || []) {
      if (omfang === 'komite' && s.komite && s.komite !== data.komite.id) continue;
      ut.push({ dato: s.dato, type: 'salen', tittel: s.tekst, url: s.sakId ? `https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${s.sakId}` : undefined, detalj: s.henvisning, komite: s.komite });
    }
    const aar = new Date().getFullYear();
    ut.push(...budsjettaret(aar), ...budsjettaret(aar + 1));
    return ut;
  }, [data, omfang]);

  const nå = Date.now();
  const fra = passerte ? nå - 30 * 86400000 : nå - 86400000;
  const til = nå + 365 * 86400000;
  const vis = hendelser
    .filter((h) => (!typer.length || typer.includes(h.type)) && new Date(h.dato).getTime() >= fra && new Date(h.dato).getTime() <= til)
    .sort((a, b) => a.dato.localeCompare(b.dato));

  const perMnd = new Map<string, Hendelse[]>();
  for (const h of vis) {
    const k = h.dato.slice(0, 7);
    if (!perMnd.has(k)) perMnd.set(k, []);
    perMnd.get(k)!.push(h);
  }
  const mndNavn = (k: string) => new Date(`${k}-15`).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
  const dag = (iso: string) => new Date(iso).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Oslo' });
  const kl = (iso: string) => {
    const k = new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });
    return k === '00:00' || k === '23:59' ? '' : ` kl. ${k}`;
  };

  return (
    <>
      <div className="lokale-filtre">
        <Segment etikett="Omfang" verdi={omfang} sett={setOmfang} valg={[{ id: 'komite', navn: 'Helse- og omsorgskomiteen' }, { id: 'alle', navn: 'Alle helsesaker' }]} />
        <Chips valg={TYPER} valgt={typer} sett={setTyper} />
        <label className="bryter"><input type="checkbox" checked={passerte} onChange={(e) => setPasserte(e.target.checked)} /> Vis siste 30 dager</label>
      </div>
      <p className="dempet liten-tekst">
        Fristene for komiteens innstilling viser når det er for sent å påvirke saken i komiteen. Debatter i salen vises når dagsordenen er publisert, vanligvis noen dager før.
        Budsjettåret er omtrentlig og følger WA Helses Access-modell.
      </p>
      {perMnd.size === 0 && <p className="tomt">Ingen hendelser i valgt utvalg.</p>}
      {[...perMnd.entries()].map(([mnd, liste]) => (
        <Seksjon key={mnd} tittel={mndNavn(mnd)}>
          <ul className="kalenderliste">
            {liste.map((h, i) => (
              <li key={i} className={`kal kal-${h.type}`}>
                <div className="kal-dato">{h.omtrentlig ? 'ca. ' + new Date(h.dato).toLocaleDateString('nb-NO', { month: 'short' }) : <>{dag(h.dato)}<span>{kl(h.dato)}</span></>}</div>
                <div>
                  <span className="type">{TYPE_NAVN[h.type]}</span>
                  <p className="kal-tittel">{h.url ? <a href={h.url} target="_blank" rel="noreferrer">{h.tittel}</a> : h.tittel}</p>
                  {(h.detalj || (h.komite && h.komite !== data.komite.id)) && (
                    <p className="dempet liten-tekst">{[h.detalj, h.komite && h.komite !== data.komite.id ? data.komiteNavn[h.komite] : null].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Seksjon>
      ))}
    </>
  );
}
