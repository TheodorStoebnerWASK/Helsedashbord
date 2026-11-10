'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, ElementListe, Chips, Segment } from '../felles';
import { Graf } from '../Graf';
import { perParti, perRepresentant, perTema, sammenlignOverTid, sammenlignPerSesjon, type Enhet } from '@/lib/byggere';
import { PARTIER, PARTI_REKKEFOLGE, partiFarge, partiKort } from '@/lib/parti';
import { SPORSMAL_TYPER, TYPE_NAVN, type ElementType } from '@/lib/types';
import { sesjonKort } from '@/lib/analyse';

// Fast rekkefølge for sammenligningsfarger (validert for fargeblindhet i parvise naboer)
const SAMMENLIGN_FARGER = ['#2F86B8', '#E5402A', '#2E9E6E', '#DDA21A', '#8A5AB0', '#B5651D'];

type Dim = 'parti' | 'representant' | 'tema' | 'kategori';

export function Sporsmal() {
  const c = useData();
  const { data, filtrert } = c;
  const [typer, setTyper] = useState<ElementType[]>(['skriftlig', 'muntlig', 'interpellasjon']);
  const [kunKomite, setKunKomite] = useState(false);
  const [andre, setAndre] = useState(true);
  const [partier, setPartier] = useState<string[]>([]);
  const [etterKat, setEtterKat] = useState(false);

  const liste = useMemo(() => filtrert.filter((e) =>
    SPORSMAL_TYPER.includes(e.type) && typer.includes(e.type) &&
    (andre || e.direkte) &&
    (!kunKomite || (e.fra && data.komite.medlemmer.includes(e.fra))) &&
    (!partier.length || (e.fra && partier.includes(data.personer[e.fra]?.parti || '')))
  ), [filtrert, typer, kunKomite, andre, partier, data]);

  const utvalg = [
    typer.length < 3 ? typer.map((t) => TYPE_NAVN[t]).join(', ') : 'Alle spørsmålstyper',
    c.filtre.sesjon === 'alle' ? 'hele perioden' : `sesjon ${sesjonKort(c.filtre.sesjon)}`,
    kunKomite ? 'kun komiteens medlemmer' : null,
  ].filter(Boolean).join(' · ');

  const sParti = useMemo(() => perParti(liste, c, { id: `sp-parti-${etterKat}`, tittel: 'Helsespørsmål per parti', undertittel: utvalg, etterKategori: etterKat }), [liste, c, utvalg, etterKat]);
  const sRep = useMemo(() => perRepresentant(liste, c, { id: 'sp-rep', tittel: 'Mest aktive representanter', undertittel: utvalg, topp: 20 }), [liste, c, utvalg]);
  const sTema = useMemo(() => perTema(liste, c, { id: 'sp-tema', tittel: 'Spørsmål per tema', undertittel: utvalg, topp: 22 }), [liste, c, utvalg]);

  return (
    <>
      <div className="lokale-filtre">
        <Chips valg={SPORSMAL_TYPER.map((t) => ({ id: t, navn: TYPE_NAVN[t] }))} valgt={typer} sett={(v) => setTyper(v.length ? v : typer)} />
        <label className="bryter"><input type="checkbox" checked={kunKomite} onChange={(e) => setKunKomite(e.target.checked)} /> Kun komiteens medlemmer</label>
        <label className="bryter"><input type="checkbox" checked={andre} onChange={(e) => setAndre(e.target.checked)} /> Ta med helsespørsmål til andre statsråder</label>
        <Chips valg={PARTI_REKKEFOLGE.map((p) => ({ id: p, navn: partiKort(p) }))} valgt={partier} sett={setPartier} farge={partiFarge} />
      </div>
      <p className="dempet liten-tekst">{liste.length} spørsmål i utvalget</p>

      <div className="rutenett-2">
        <Graf spec={sParti} kontroller={<label className="bryter"><input type="checkbox" checked={etterKat} onChange={(e) => setEtterKat(e.target.checked)} /> Fordel på kategori</label>} />
        <Graf spec={sTema} />
      </div>
      <Graf spec={sRep} />

      <Sammenligning liste={filtrert.filter((e) => SPORSMAL_TYPER.includes(e.type) && typer.includes(e.type) && (andre || e.direkte) && (!kunKomite || (e.fra && data.komite.medlemmer.includes(e.fra))))} />

      <Seksjon tittel="Alle spørsmål i utvalget">
        <ElementListe liste={liste} />
      </Seksjon>
    </>
  );
}

export function Sammenligning({ liste, standardDim = 'parti' }: { liste: ReturnType<typeof useData>['filtrert']; standardDim?: Dim }) {
  const c = useData();
  const { data } = c;
  const [dim, setDim] = useState<Dim>(standardDim);
  const [valgt, setValgt] = useState<Record<Dim, string[]>>({
    parti: ['A', 'H', 'FrP', 'SV'],
    representant: [],
    tema: ['legemiddeltilgang', 'kreft', 'sykehus', 'psykisk-rus'],
    kategori: data.taksonomi.kategorier.map((k) => k.id),
  });
  const [visning, setVisning] = useState<'tid' | 'kumulativ' | 'sesjon' | 'samme'>('tid');

  const repValg = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of liste) if (e.fra) m.set(e.fra, (m.get(e.fra) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([id]) => ({ id, navn: `${data.personer[id]?.navn} (${partiKort(data.personer[id]?.parti)})` }));
  }, [liste, data]);
  const valg = {
    parti: PARTI_REKKEFOLGE.map((p) => ({ id: p, navn: PARTIER[p].kort })),
    representant: repValg,
    tema: data.taksonomi.temaer.filter((t) => t.id !== 'annet').map((t) => ({ id: t.id, navn: t.navn })),
    kategori: data.taksonomi.kategorier.map((k) => ({ id: k.id, navn: k.navn })),
  }[dim];
  const aktive = dim === 'representant' && !valgt.representant.length ? repValg.slice(0, 4).map((r) => r.id) : valgt[dim];

  const enheter: Enhet[] = aktive.map((id, i) => {
    if (dim === 'parti') return { id, navn: PARTIER[id]?.kort || id, farge: partiFarge(id), treff: (e) => !!e.fra && data.personer[e.fra]?.parti === id };
    if (dim === 'representant') return { id, navn: data.personer[id]?.navn || id, farge: SAMMENLIGN_FARGER[i % 6], treff: (e) => e.fra === id };
    if (dim === 'tema') return { id, navn: c.temaNavn(id), farge: SAMMENLIGN_FARGER[i % 6], treff: (e) => e.temaer.includes(id) };
    return { id, navn: c.katNavn(id), farge: c.katFarge(id), treff: (e) => e.kategori === id };
  });
  const dimNavn = { parti: 'partier', representant: 'representanter', tema: 'temaer', kategori: 'kategorier' }[dim];
  const spec = useMemo(() => {
    const base = { id: `sammenlign-${dim}-${visning}-${aktive.join('_')}`, tittel: `Sammenligning av ${dimNavn}` };
    if (visning === 'sesjon' || visning === 'samme')
      return sammenlignPerSesjon(liste, enheter, data.meta.sesjoner, { ...base, sammePeriode: visning === 'samme', undertittel: visning === 'samme' ? `Antall spørsmål per sesjon – like mange dager inn i hver sesjon` : 'Antall spørsmål per sesjon' });
    return sammenlignOverTid(liste, enheter, { ...base, kumulativ: visning === 'kumulativ', undertittel: visning === 'kumulativ' ? 'Kumulativt antall spørsmål' : 'Antall spørsmål per måned' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste, dim, visning, aktive.join(','), data]);

  return (
    <Seksjon tittel="Sammenlign">
      <div className="sammenlign-kontroller">
        <Segment etikett="Sammenlign" verdi={dim} sett={setDim} valg={[{ id: 'parti', navn: 'Partier' }, { id: 'representant', navn: 'Representanter' }, { id: 'tema', navn: 'Temaer' }, { id: 'kategori', navn: 'Kategorier' }]} />
        <Segment etikett="Visning" verdi={visning} sett={setVisning} valg={[{ id: 'tid', navn: 'Per måned' }, { id: 'kumulativ', navn: 'Kumulativt' }, { id: 'sesjon', navn: 'Per sesjon' }, { id: 'samme', navn: 'Samme periode i fjor' }]} />
      </div>
      <Chips valg={valg} valgt={aktive} sett={(v) => setValgt({ ...valgt, [dim]: v })} maks={dim === 'parti' || dim === 'kategori' ? 10 : 6} farge={dim === 'parti' ? partiFarge : dim === 'kategori' ? c.katFarge : undefined} />
      <Graf spec={spec} hoyde={340} />
    </Seksjon>
  );
}
