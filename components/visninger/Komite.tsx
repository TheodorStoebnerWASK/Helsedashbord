'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, Portrett, PartiMerke, Segment } from '../felles';
import { Graf } from '../Graf';
import { perParti } from '@/lib/byggere';
import { PARTIER, PARTI_REKKEFOLGE, partiFarge, partiKort } from '@/lib/parti';
import { SPORSMAL_TYPER } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

export function Komite() {
  const c = useData();
  const { data, filtrert, visPerson, temaNavn } = c;
  const [sorter, setSorter] = useState<'parti' | 'aktivitet' | 'navn'>('parti');

  const sp = useMemo(() => filtrert.filter((e) => SPORSMAL_TYPER.includes(e.type)), [filtrert]);
  const medlemmer = useMemo(() => {
    const m = data.komite.medlemmer.map((id) => {
      const p = data.personer[id];
      const mine = sp.filter((e) => e.fra === id);
      const temaer = new Map<string, number>();
      for (const e of mine) for (const t of e.temaer) if (t !== 'annet') temaer.set(t, (temaer.get(t) || 0) + 1);
      const ordforer = filtrert.filter((e) => e.type === 'sak' && e.saksordforere?.includes(id)).length;
      const forslag = filtrert.filter((e) => e.type === 'sak' && e.forslagstillere?.includes(id)).length;
      return { id, p, antall: mine.length, ordforer, forslag, topp: [...temaer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3) };
    });
    const r = (x: string | undefined) => PARTI_REKKEFOLGE.indexOf(x || '');
    return m.sort((a, b) =>
      sorter === 'aktivitet' ? b.antall - a.antall :
      sorter === 'navn' ? a.p.navn.localeCompare(b.p.navn, 'nb') :
      r(a.p.parti) - r(b.p.parti) || b.antall - a.antall);
  }, [data, sp, filtrert, sorter]);

  const seter: GrafSpec = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of data.komite.medlemmer) { const p = data.personer[id]?.parti || '?'; m.set(p, (m.get(p) || 0) + 1); }
    const ps = PARTI_REKKEFOLGE.filter((p) => m.has(p));
    return {
      id: 'komite-seter', tittel: 'Helse- og omsorgskomiteens sammensetning', undertittel: `${data.komite.medlemmer.length} medlemmer per parti`, form: 'stolpe', enhet: 'medlemmer',
      kategorier: ps.map((p) => PARTIER[p].kort), serier: [{ navn: 'Medlemmer', data: ps.map((p) => m.get(p)!), fargerPerPunkt: ps.map(partiFarge) }],
    };
  }, [data]);
  const perMedlem: GrafSpec = useMemo(() => {
    const s = [...medlemmer].sort((a, b) => b.antall - a.antall);
    return {
      id: 'komite-medlem-sp', tittel: 'Helsespørsmål fra komiteens medlemmer', undertittel: 'Skriftlige spørsmål, spørretime og interpellasjoner', form: 'liggende', enhet: 'stk',
      kategorier: s.map((m) => `${m.p.navn} (${partiKort(m.p.parti)})`), serier: [{ navn: 'Spørsmål', data: s.map((m) => m.antall), fargerPerPunkt: s.map((m) => partiFarge(m.p.parti)) }],
    };
  }, [medlemmer]);
  const komiteParti = useMemo(
    () => perParti(sp.filter((e) => e.fra && data.komite.medlemmer.includes(e.fra)), c, { id: 'komite-parti-kat', tittel: 'Komitémedlemmenes spørsmål per parti og kategori', etterKategori: true }),
    [sp, data, c],
  );

  return (
    <>
      <Seksjon
        tittel={data.komite.navn}
        hoyre={<Segment etikett="Sorter" verdi={sorter} sett={setSorter} valg={[{ id: 'parti', navn: 'Parti' }, { id: 'aktivitet', navn: 'Mest aktiv' }, { id: 'navn', navn: 'Navn' }]} />}
      >
        <div className="medlemmer">
          {medlemmer.map((m) => (
            <button key={m.id} className="medlem" onClick={() => visPerson(m.id)} style={{ ['--pf' as string]: partiFarge(m.p.parti) }}>
              <Portrett id={m.id} str={120} gra />
              <div className="medlem-info">
                {data.komite.roller[m.id] && <span className="rolle">{data.komite.roller[m.id]}</span>}
                <strong>{m.p.navn}</strong>
                <span className="dempet liten-tekst"><PartiMerke parti={m.p.parti} /> {m.p.fylke}</span>
                <span className="medlem-tall"><b>{m.antall}</b> helsespørsmål{m.ordforer ? <> · <b>{m.ordforer}</b> saksordfører</> : null}{m.forslag ? <> · <b>{m.forslag}</b> forslag</> : null}</span>
                {m.topp.length > 0 && <span className="medlem-temaer">{m.topp.map(([t]) => temaNavn(t)).join(' · ')}</span>}
              </div>
            </button>
          ))}
        </div>
      </Seksjon>
      <div className="rutenett-2">
        <Graf spec={perMedlem} />
        <div>
          <Graf spec={seter} hoyde={240} />
          <Graf spec={komiteParti} />
        </div>
      </div>
    </>
  );
}
