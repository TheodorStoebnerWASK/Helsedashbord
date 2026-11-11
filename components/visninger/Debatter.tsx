'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Stat, KategoriMerke, Chips, Segment, PartiMerke, Portrett } from '../felles';
import { Graf } from '../Graf';
import { useLat } from './Innspill';
import { datoKort } from '@/lib/analyse';
import { PARTIER, PARTI_REKKEFOLGE, partiFarge, partiKort } from '@/lib/parti';
import type { DebattData, Debattdel, Innlegg } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

interface Debatt extends Debattdel { refId: string; dato?: string; sesjon: string }

const referatUrl = (refId: string, sesjon: string) =>
  `https://www.stortinget.no/no/Saker-og-publikasjoner/Publikasjoner/Referater/Stortinget/${sesjon}/${refId}/`;

// Parti fra «(Sp)» i referatet; statsråder står uten parti
const partiAv = (i: Innlegg) => (i.parti === 'Ap' ? 'A' : i.parti);

export function Debatter() {
  const { data: rå, feil } = useLat<DebattData>('/api/debatter');
  const { filtre } = useData();
  const [type, setType] = useState<'alle' | 'sak' | 'spørretime'>('alle');
  const [partier, setPartier] = useState<string[]>([]);
  const [sok, setSok] = useState('');

  const debatter: Debatt[] = useMemo(() => {
    if (!rå) return [];
    const ut: Debatt[] = [];
    for (const [refId, r] of Object.entries(rå)) for (const d of r.deler) ut.push({ ...d, refId, dato: r.dato, sesjon: r.sesjon });
    return ut.sort((a, b) => String(b.dato).localeCompare(String(a.dato)));
  }, [rå]);

  const q = (sok || filtre.sok).toLowerCase().trim();
  const utvalg = useMemo(() => debatter.filter((d) =>
    (filtre.sesjon === 'alle' || d.sesjon === filtre.sesjon) &&
    (!filtre.kategorier.length || (d.kategori && filtre.kategorier.includes(d.kategori))) &&
    (type === 'alle' || d.type === type) &&
    (!partier.length || d.innlegg.some((i) => partier.includes(partiAv(i) || ''))) &&
    (!q || `${d.tittel} ${d.innlegg.map((i) => `${i.navn} ${i.tekst}`).join(' ')}`.toLowerCase().includes(q)),
  ), [debatter, filtre, type, partier, q]);

  const innlegg = useMemo(() => utvalg.flatMap((d) => d.innlegg.filter((i) => !q || `${i.navn} ${i.tekst}`.toLowerCase().includes(q) || d.tittel.toLowerCase().includes(q))), [utvalg, q]);

  const partiSpec: GrafSpec = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of innlegg) { const p = partiAv(i); if (p && PARTIER[p]) m.set(p, (m.get(p) || 0) + 1); }
    const ps = PARTI_REKKEFOLGE.filter((p) => m.has(p)).sort((a, b) => m.get(b)! - m.get(a)!);
    return { id: `debatt-parti-${q}`, tittel: q ? `Innlegg som nevner «${q}», per parti` : 'Innlegg i helsedebatter per parti', undertittel: 'Hovedinnlegg og replikker. Statsråder uten parti er ikke med.', form: 'liggende', enhet: 'innlegg',
      kategorier: ps.map((p) => PARTIER[p].navn), serier: [{ navn: 'Innlegg', data: ps.map((p) => m.get(p)!), fargerPerPunkt: ps.map(partiFarge) }] };
  }, [innlegg, q]);
  const talerSpec: GrafSpec = useMemo(() => {
    const m = new Map<string, { n: number; parti?: string }>();
    for (const i of innlegg) { const k = i.navn; const x = m.get(k) || { n: 0, parti: partiAv(i) }; x.n++; m.set(k, x); }
    const topp = [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 15);
    return { id: `debatt-talere-${q}`, tittel: 'Mest aktive i helsedebattene', undertittel: 'Antall innlegg og replikker', form: 'liggende', enhet: 'innlegg',
      kategorier: topp.map(([n, x]) => (x.parti ? `${n} (${partiKort(x.parti)})` : n)), serier: [{ navn: 'Innlegg', data: topp.map(([, x]) => x.n), fargerPerPunkt: topp.map(([, x]) => partiFarge(x.parti)) }] };
  }, [innlegg, q]);

  if (feil) return <p className="tomt">Kunne ikke laste debatter.</p>;
  if (!rå) return <div className="laster"><span className="spinner" /> Laster debatter …</div>;

  return (
    <>
      <div className="stats">
        <Stat tall={utvalg.filter((d) => d.type === 'sak').length} etikett="debatter om helsesaker" />
        <Stat tall={utvalg.filter((d) => d.type === 'spørretime').length} etikett="spørsmål i spørretimen" />
        <Stat tall={innlegg.length} etikett={q ? `innlegg som nevner «${q}»` : 'innlegg og replikker'} />
        <Stat tall={new Set(innlegg.map((i) => i.navn)).size} etikett="talere" />
      </div>
      <div className="lokale-filtre">
        <input className="sokefelt" type="search" placeholder="Hvem sa hva? Søk i debattene – f.eks. «fritt behandlingsvalg», «terskelverdi»" value={sok} onChange={(e) => setSok(e.target.value)} aria-label="Søk i debattene" />
        <Segment etikett="Type" verdi={type} sett={setType} valg={[{ id: 'alle', navn: 'Alle' }, { id: 'sak', navn: 'Debatter' }, { id: 'spørretime', navn: 'Spørretimen' }]} />
        <Chips valg={PARTI_REKKEFOLGE.map((p) => ({ id: p, navn: partiKort(p) }))} valgt={partier} sett={setPartier} farge={partiFarge} />
      </div>
      <div className="rutenett-2">
        <Graf spec={partiSpec} />
        <Graf spec={talerSpec} />
      </div>
      <Seksjon tittel={`Debatter og spørsmål (${utvalg.length})`}>
        <ul className="elementer">
          {utvalg.slice(0, 80).map((d, i) => <DebattRad key={`${d.refId}-${i}`} d={d} q={q} partier={partier} />)}
        </ul>
        {utvalg.length > 80 && <p className="dempet liten-tekst">Viser 80 av {utvalg.length}. Bruk søk eller filtre for å snevre inn.</p>}
      </Seksjon>
    </>
  );
}

function DebattRad({ d, q, partier }: { d: Debatt; q: string; partier: string[] }) {
  const { temaNavn, data } = useData();
  const [apen, setApen] = useState(false);
  const treff = q || partier.length ? d.innlegg.filter((i) => (!q || `${i.navn} ${i.tekst}`.toLowerCase().includes(q)) && (!partier.length || partier.includes(partiAv(i) || ''))) : [];
  const vis = apen ? d.innlegg : treff.slice(0, 3);
  const sakUrl = d.sakId ? `https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${d.sakId}` : referatUrl(d.refId, d.sesjon);
  return (
    <li className="element">
      <div className="element-meta">
        <span className="type">{d.type === 'sak' ? 'Debatt' : 'Spørretimen'}</span>
        <time>{datoKort(d.dato)}</time>
      </div>
      <div className="element-innhold">
        <p className="element-tittel"><a href={sakUrl} target="_blank" rel="noreferrer">{d.tittel}</a></p>
        <div className="element-detaljer">
          <span className="dempet">{d.innlegg.length} innlegg · {[...new Set(d.innlegg.map((i) => partiKort(partiAv(i))).filter((p) => p && p !== 'Ukjent'))].join(', ')}</span>
          <a className="dempet" href={referatUrl(d.refId, d.sesjon)} target="_blank" rel="noreferrer">Referat ↗</a>
        </div>
        <div className="element-merker">
          {d.kategori && <KategoriMerke id={d.kategori} />}
          {(d.temaer || []).filter((t) => t !== 'annet').map((t) => <span key={t} className="tema-merke">{temaNavn(t)}</span>)}
        </div>
        {vis.length > 0 && (
          <div className="innspill-liste">
            {vis.map((i, n) => (
              <div key={n} className="innspill innlegg">
                <div className="innlegg-hode">
                  {i.p && data.personer[i.p] ? <Portrett id={i.p} str={22} /> : null}
                  <strong>{i.navn}</strong> {partiAv(i) && <PartiMerke parti={partiAv(i)} />}
                  <span className="dempet liten-tekst">{i.type === 'replikk' ? 'replikk' : 'innlegg'}{i.tid ? ` kl. ${i.tid}` : ''}</span>
                </div>
                <p>{i.tekst}{i.lengde > i.tekst.length ? ' …' : ''}</p>
              </div>
            ))}
          </div>
        )}
        <button className="lenkeknapp liten" onClick={() => setApen(!apen)}>{apen ? 'Skjul innleggene' : `Vis alle ${d.innlegg.length} innlegg`}</button>
      </div>
    </li>
  );
}
