'use client';
import { useEffect, useMemo, useState } from 'react';
import { useData, Seksjon, Stat, KategoriMerke } from '../felles';
import { Graf } from '../Graf';
import { datoKort } from '@/lib/analyse';
import type { Element, InnspillData } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

/** Laster en stor JSON-fil først når fanen åpnes. */
export function useLat<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [feil, setFeil] = useState(false);
  useEffect(() => {
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setFeil(true));
  }, [url]);
  return { data, feil };
}

const nokkel = (org: string) => org.toLowerCase().replace(/[^\p{L}\d]+/gu, ' ').trim();

interface Bidrag { horing: Element; type: 'skriftlig' | 'muntlig'; org: string; tittel?: string; tekst?: string; lengde?: number; personer?: string[]; dato?: string }

export function Innspill() {
  const { data: inn, feil } = useLat<InnspillData>('/api/innspill');
  const { filtrert } = useData();
  const [org, setOrg] = useState<string | null>(null);
  const [sok, setSok] = useState('');

  // Alle bidrag (skriftlige innspill + muntlige deltakere) koblet til høringene som er synlige etter globale filtre
  const { bidrag, horinger, utilgjengelige } = useMemo(() => {
    const horinger = filtrert.filter((e) => e.type === 'horing');
    const bidrag: Bidrag[] = [];
    let utilgjengelige = 0;
    for (const h of horinger) {
      const d = inn?.[h.id.replace('horing-', '')];
      if (!d) continue;
      if (d.utilgjengelig) utilgjengelige++;
      for (const i of d.innspill) bidrag.push({ horing: h, type: 'skriftlig', org: i.org, tittel: i.tittel, tekst: i.tekst, lengde: i.lengde, dato: i.dato });
      for (const p of d.deltakere) bidrag.push({ horing: h, type: 'muntlig', org: p.org, personer: p.personer });
    }
    return { bidrag, horinger, utilgjengelige };
  }, [inn, filtrert]);

  const orgNavn = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of bidrag) if (!m.has(nokkel(b.org))) m.set(nokkel(b.org), b.org);
    return m;
  }, [bidrag]);

  const utvalg = useMemo(() => {
    const q = sok.toLowerCase().trim();
    return bidrag.filter((b) => (!org || nokkel(b.org) === org) && (!q || `${b.org} ${b.tittel || ''} ${b.tekst || ''}`.toLowerCase().includes(q)));
  }, [bidrag, org, sok]);

  const toppSpec: GrafSpec = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const b of utvalg) {
      const k = nokkel(b.org);
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(b.horing.id);
    }
    const topp = [...m.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 25);
    return {
      id: `innspill-topp-${sok}`, tittel: sok ? `Organisasjoner som nevner «${sok}»` : 'Mest aktive organisasjoner i helsehøringene',
      undertittel: 'Antall høringer med skriftlig innspill eller muntlig deltakelse', form: 'liggende', enhet: 'høringer',
      kategorier: topp.map(([k]) => orgNavn.get(k) || k), serier: [{ navn: 'Høringer', data: topp.map(([, s]) => s.size), farge: '#3D99C7' }],
    };
  }, [utvalg, orgNavn, sok]);

  if (feil) return <p className="tomt">Kunne ikke laste høringsinnspill.</p>;
  if (!inn) return <div className="laster"><span className="spinner" /> Laster høringsinnspill …</div>;

  const perHoring = new Map<string, Bidrag[]>();
  for (const b of utvalg) {
    if (!perHoring.has(b.horing.id)) perHoring.set(b.horing.id, []);
    perHoring.get(b.horing.id)!.push(b);
  }
  const sorterteHoringer = [...perHoring.keys()].map((id) => horinger.find((h) => h.id === id)!).sort((a, b) => String(b.dato).localeCompare(String(a.dato)));

  return (
    <>
      <div className="stats">
        <Stat tall={utvalg.filter((b) => b.type === 'skriftlig').length} etikett="skriftlige innspill" />
        <Stat tall={utvalg.filter((b) => b.type === 'muntlig').length} etikett="muntlige innlegg" />
        <Stat tall={new Set(utvalg.map((b) => nokkel(b.org))).size} etikett="organisasjoner" />
        <Stat tall={perHoring.size} etikett="høringer" hint={utilgjengelige ? `${utilgjengelige} skriftlige høringer mangler innspill (feil i Stortingets API)` : undefined} />
      </div>

      <div className="lokale-filtre">
        <input className="sokefelt" type="search" placeholder="Søk i innspillene – f.eks. «terskelverdi», «legemiddelindustrien», «LMI»" value={sok} onChange={(e) => setSok(e.target.value)} aria-label="Søk i innspill" />
        {org && <button className="chip på" onClick={() => setOrg(null)}>{orgNavn.get(org)} ×</button>}
      </div>

      <div className="rutenett-sidepanel">
        <Seksjon tittel={org ? `Alt fra ${orgNavn.get(org)}` : 'Høringer og innspill'}>
          {sorterteHoringer.length === 0 && <p className="tomt">Ingen innspill i utvalget.</p>}
          <ul className="elementer">
            {sorterteHoringer.slice(0, 60).map((h) => <HoringBlokk key={h.id} h={h} bidrag={perHoring.get(h.id)!} velgOrg={setOrg} sok={sok} />)}
          </ul>
        </Seksjon>
        <aside>
          <Graf spec={toppSpec} />
          <p className="dempet liten-tekst">
            Klikk på en organisasjon i listen for å se alle innspillene deres. Muntlige deltakere er hentet fra høringsprogrammene.
            Innspill til <em>skriftlige</em> høringer mangler foreløpig, fordi Stortingets API gir feil for dem. De hentes automatisk når det er rettet.
          </p>
        </aside>
      </div>
    </>
  );
}

function HoringBlokk({ h, bidrag, velgOrg, sok }: { h: Element; bidrag: Bidrag[]; velgOrg: (k: string) => void; sok: string }) {
  const { temaNavn } = useData();
  const [apen, setApen] = useState(!!sok);
  const skriftlige = bidrag.filter((b) => b.type === 'skriftlig');
  const muntlige = bidrag.filter((b) => b.type === 'muntlig');
  return (
    <li className="element">
      <div className="element-meta">
        <span className="type">Høring</span>
        <time>{datoKort(h.tider?.[0]?.tid || h.dato)}</time>
      </div>
      <div className="element-innhold">
        <p className="element-tittel"><a href={h.url} target="_blank" rel="noreferrer">{h.tittel}</a></p>
        <div className="element-merker">
          <KategoriMerke id={h.kategori} />
          {h.temaer.filter((t) => t !== 'annet').map((t) => <span key={t} className="tema-merke">{temaNavn(t)}</span>)}
        </div>
        <div className="org-liste">
          {[...new Map(bidrag.map((b) => [nokkel(b.org), b.org])).entries()].map(([k, n]) => (
            <button key={k} className="org" onClick={() => velgOrg(k)}>{n}</button>
          ))}
        </div>
        <button className="lenkeknapp liten" onClick={() => setApen(!apen)}>
          {apen ? 'Skjul innspillene' : `Vis ${skriftlige.length} skriftlige innspill${muntlige.length ? ` og ${muntlige.length} muntlige` : ''}`}
        </button>
        {apen && (
          <div className="innspill-liste">
            {skriftlige.map((b, i) => (
              <div key={i} className="innspill">
                <strong>{b.org}</strong>
                <p>{b.tekst}{(b.lengde || 0) > (b.tekst?.length || 0) ? ' …' : ''}</p>
              </div>
            ))}
            {muntlige.map((b, i) => (
              <div key={`m${i}`} className="innspill muntlig">
                <strong>{b.org}</strong> <span className="dempet">møtte muntlig</span>
                {b.personer?.length ? <p className="dempet liten-tekst">{b.personer.join(' · ')}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
