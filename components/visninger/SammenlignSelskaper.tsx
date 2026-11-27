'use client';
import { useMemo, useState } from 'react';
import { Seksjon, Chips } from '../felles';
import { Graf } from '../Graf';
import { useNyheter } from './Nyheter';
import { maneder, mndNavn, mndNokkel } from '@/lib/analyse';
import type { AccessData, MarkedData, Selskap } from '@/lib/types';
import type { GrafSpec } from '@/lib/graf';

// Samme validerte sammenligningsfarger som ellers i dashbordet
const FARGER = ['#2F86B8', '#E5402A', '#2E9E6E', '#DDA21A', '#8A5AB0', '#B5651D'];
const BRREG = 'Kilde: Brønnøysundregistrene (Regnskapsregisteret). Bearbeidet av Wergeland Apenes.';
const KURS: Record<string, number> = { NOK: 1, EUR: 11.6, USD: 10.6, SEK: 1.0, DKK: 1.55, GBP: 13.6, CHF: 12.4 };
const rxAv = (s?: string) => { try { return s ? new RegExp(s, 'i') : null; } catch { return null; } };
const kort = (s: Selskap) => s.navn.replace(/\s*\(.*\)/, '').replace(/\s+(Norge|Norway)$/i, '');
const nok = (v: number | null | undefined, valuta: string) => (v == null ? 0 : Math.round((v * (KURS[valuta] || 1)) / 1e6));

/** Sammenlign opptil seks selskaper: økonomi, ansatte, Nye metoder, EMA, pipeline og medieomtale. */
export function SammenlignSelskaper({ marked, acc }: { marked: MarkedData; acc: AccessData | null }) {
  const { liste: nyheter } = useNyheter();
  const [sektor, setSektor] = useState<string>('legemidler');
  const startvalg = useMemo(() => ['935925525', '965599614', '915213596', '918229353'].filter((id) => marked.selskaper.some((s) => s.nokkel === id)), [marked]);
  const [valgt, setValgt] = useState<string[]>(startvalg);
  const valgbare = marked.selskaper.filter((s) => s.sektor === sektor).sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
  const sel = valgt.map((id) => marked.selskaper.find((s) => s.nokkel === id)).filter(Boolean) as Selskap[];
  const farge = (i: number) => FARGER[i % FARGER.length];
  const undertittel = sel.map(kort).join(' · ');

  const specs = useMemo(() => {
    const ut: GrafSpec[] = [];
    if (!sel.length) return ut;
    const aar = [...new Set(sel.flatMap((s) => (s.regnskap || []).map((r) => r.aar)))].sort();
    const verdi = (s: Selskap, a: number, felt: 'omsetning' | 'resultat' | 'driftsresultat') => {
      const r = s.regnskap?.find((x) => x.aar === a);
      return r ? nok(r[felt], r.valuta) : 0;
    };
    if (aar.length) {
      ut.push({
        id: `smp-oms-${valgt.join('_')}`, tittel: 'Omsetning i Norge', undertittel: 'Driftsinntekter per år, millioner kroner', form: 'stolpe', enhet: 'mill. kr', kilde: BRREG,
        kategorier: aar.map(String), serier: sel.map((s, i) => ({ navn: kort(s), farge: farge(i), data: aar.map((a) => verdi(s, a, 'omsetning')) })),
      });
      ut.push({
        id: `smp-res-${valgt.join('_')}`, tittel: 'Årsresultat', undertittel: 'Millioner kroner', form: 'stolpe', enhet: 'mill. kr', kilde: BRREG,
        kategorier: aar.map(String), serier: sel.map((s, i) => ({ navn: kort(s), farge: farge(i), data: aar.map((a) => verdi(s, a, 'resultat')) })),
      });
      const siste = aar[aar.length - 1];
      ut.push({
        id: `smp-margin-${valgt.join('_')}`, tittel: 'Driftsmargin', undertittel: `Driftsresultat i prosent av omsetning, ${siste}`, form: 'liggende', enhet: '%', kilde: BRREG,
        kategorier: sel.map(kort),
        serier: [{ navn: 'Driftsmargin', data: sel.map((s) => { const r = s.regnskap?.find((x) => x.aar === siste); return r?.omsetning && r.driftsresultat != null ? Math.round((1000 * r.driftsresultat) / r.omsetning) / 10 : 0; }), fargerPerPunkt: sel.map((_, i) => farge(i)) }],
      });
    }
    ut.push({
      id: `smp-ansatte-${valgt.join('_')}`, tittel: 'Ansatte i Norge', undertittel: 'Fra Enhetsregisteret', form: 'liggende', enhet: 'ansatte', kilde: 'Kilde: Brønnøysundregistrene (Enhetsregisteret). Bearbeidet av Wergeland Apenes.',
      kategorier: sel.map(kort), serier: [{ navn: 'Ansatte', data: sel.map((s) => s.ansatte || 0), fargerPerPunkt: sel.map((_, i) => farge(i)) }],
    });

    // Nye metoder: siste status per metode for hvert selskap
    if (acc?.metoder) {
      const typer = [['innfort', 'Innført', '#2E9E6E'], ['ikke-innfort', 'Ikke innført', '#E5402A'], ['bestilt', 'Bestilt, ikke besluttet', '#2F86B8']] as const;
      const telling = sel.map((s) => {
        const rx = rxAv(s.match);
        const t: Record<string, number> = { innfort: 0, 'ikke-innfort': 0, bestilt: 0 };
        for (const m of Object.values(acc.metoder!)) {
          if (!rx || !m.selskap || !rx.test(m.selskap)) continue;
          const bsf = [...m.h].reverse().find((h) => h.f === 'bsf');
          if (bsf && (bsf.s === 'innfort' || bsf.s === 'ikke-innfort')) t[bsf.s]++;
          else if (m.h.some((h) => h.f === 'bf' && ['full', 'forenklet', 'prisnotat'].includes(h.s))) t.bestilt++;
        }
        return t;
      });
      ut.push({
        id: `smp-nm-${valgt.join('_')}`, tittel: 'Metoder i Nye metoder', undertittel: 'Siste status per metode, fra protokollene 2023–2026', form: 'liggende', stablet: true, enhet: 'metoder',
        kilde: 'Kilde: Protokoller fra Bestillerforum og Beslutningsforum (nyemetoder.no), EMA. Bearbeidet av Wergeland Apenes.',
        kategorier: sel.map(kort), serier: typer.map(([id, navn, f]) => ({ navn, farge: f, data: telling.map((t) => t[id]) })),
      });
      const emaTyper = [['opinion', 'Positiv opinion', '#2F86B8'], ['godkjent', 'Godkjent i EU', '#2E9E6E'], ['avslag', 'Avslag', '#E5402A'], ['trukket', 'Trukket', '#DDA21A']] as const;
      ut.push({
        id: `smp-ema-${valgt.join('_')}`, tittel: 'Saker hos EMA', undertittel: 'Siste to år', form: 'liggende', stablet: true, enhet: 'saker',
        kilde: 'Kilde: EMAs åpne legemiddeldata. Bearbeidet av Wergeland Apenes.',
        kategorier: sel.map(kort),
        serier: emaTyper.map(([id, navn, f]) => ({ navn, farge: f, data: sel.map((s) => { const rx = rxAv(s.match); return (acc.ema || []).filter((e) => e.type === id && rx && rx.test(e.innehaver || '')).length; }) })),
      });
    }
    if (sel.some((s) => s.studier?.length)) {
      ut.push({
        id: `smp-fase3-${valgt.join('_')}`, tittel: 'Pipeline: pågående fase 3-studier', undertittel: 'Med og uten norske studiesentre', form: 'liggende', stablet: true, enhet: 'studier',
        kilde: 'Kilde: ClinicalTrials.gov. Bearbeidet av Wergeland Apenes.',
        kategorier: sel.map(kort),
        serier: [
          { navn: 'Med norske sentre', farge: '#E5402A', data: sel.map((s) => s.studier?.filter((x) => x.norge).length || 0) },
          { navn: 'Uten norske sentre', farge: '#2F86B8', data: sel.map((s) => s.studier?.filter((x) => !x.norge).length || 0) },
        ],
      });
    }
    if (nyheter.length) {
      const mnd = maneder(mndNokkel(nyheter[nyheter.length - 1].d));
      ut.push({
        id: `smp-nyh-${valgt.join('_')}`, tittel: 'Omtale i mediene', undertittel: 'Saker per måned i Dagens Medisin, Medwatch m.fl. som nevner selskapet', form: 'linje', enhet: 'saker',
        kilde: 'Kilde: Fag- og nyhetsmedier. Bearbeidet av Wergeland Apenes.',
        kategorier: mnd.map(mndNavn),
        serier: sel.map((s, i) => { const rx = rxAv(s.match); return { navn: kort(s), farge: farge(i), data: mnd.map((m) => nyheter.filter((n) => mndNokkel(n.d) === m && rx && rx.test(`${n.t} ${n.i || ''}`)).length) }; }),
      });
    }
    return ut;
  }, [sel, valgt, acc, nyheter]);

  return (
    <>
      <p className="ingress">Velg opptil seks selskaper og sammenlign dem. Alle grafene kan kopieres, lastes ned som PNG eller legges i en redigerbar PowerPoint.</p>
      <div className="lokale-filtre">
        <label className="velger">
          <span className="eyebrow">Sektor</span>
          <select value={sektor} onChange={(e) => setSektor(e.target.value)}>
            {marked.sektorer.map((s) => <option key={s.id} value={s.id}>{s.navn}</option>)}
          </select>
        </label>
        {valgt.length > 0 && <button className="lenkeknapp" onClick={() => setValgt([])}>Fjern alle valg</button>}
      </div>
      <Chips valg={valgbare.map((s) => ({ id: s.nokkel, navn: kort(s) }))} valgt={valgt} sett={setValgt} maks={6} farge={(id) => (valgt.includes(id) ? farge(valgt.indexOf(id)) : '#C9C6BE')} />
      {sel.length === 0 ? <p className="tomt">Velg minst ett selskap.</p> : (
        <>
          <p className="dempet liten-tekst">Valgt: {undertittel}. Du kan blande sektorer – bytt sektor og velg flere.</p>
          <Seksjon tittel="Nøkkeltall">
            <table className="tabell">
              <thead><tr><th>Selskap</th><th>Ansatte</th><th>Omsetning</th><th>Årsresultat</th><th>Fase 3</th></tr></thead>
              <tbody>{sel.map((s, i) => { const r = s.regnskap?.[0]; return (
                <tr key={s.nokkel}><td><i className="prikk" style={{ background: farge(i) }} /> {s.navn}</td><td>{s.ansatte?.toLocaleString('nb-NO') ?? '–'}</td>
                  <td>{r?.omsetning != null ? `${nok(r.omsetning, r.valuta).toLocaleString('nb-NO')} mill. (${r.aar})` : '–'}</td>
                  <td>{r?.resultat != null ? `${nok(r.resultat, r.valuta).toLocaleString('nb-NO')} mill.` : '–'}</td>
                  <td>{s.studier?.length ?? '–'}</td></tr>
              ); })}</tbody>
            </table>
          </Seksjon>
          <div className="rutenett-2">{specs.map((sp) => <Graf key={sp.id} spec={sp} />)}</div>
          <p className="dempet liten-tekst">Regnskapstall gjelder det norske selskapet. Beløp i euro er regnet om til kroner med omtrentlig kurs. Selskaper uten norsk enhet har ikke regnskapstall.</p>
        </>
      )}
    </>
  );
}
