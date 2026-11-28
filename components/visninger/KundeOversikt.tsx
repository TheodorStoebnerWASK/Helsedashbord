'use client';
import { useMemo, useState } from 'react';
import { Seksjon, Segment, Stat } from '../felles';
import { useLat } from './Innspill';
import { useKunder, STATUS_NAVN, STATUS_FARGE } from './kunder';
import { datoKort } from '@/lib/analyse';
import { rxAv, sakslisteTreff, blaresept, kommendeSakslister, selskapsMetoder, underVurdering, BLA_STATUS_FORKLARING } from '@/lib/kundesignal';
import type { AccessData, KundeStatus, MarkedData, Selskap } from '@/lib/types';

/** Åpner kundeprofilen (Selskapsradaren) for et selskap. */
export function apneProfil(nokkel: string) {
  try { sessionStorage.setItem('kunde-valgt', nokkel); } catch { /* ok */ }
  location.hash = 'kunder/radar';
}

function SelskapNavn({ s, status }: { s: Selskap; status?: KundeStatus }) {
  return (
    <span className="selskap-navn">
      {s.logo ? <img className="logo" src={s.logo} alt="" width={28} height={28} /> : <span className="logo tom">{s.navn.slice(0, 2)}</span>}
      <button className="navnlenke" onClick={() => apneProfil(s.nokkel)}>{s.navn}</button>
      {status && <span className="status-merke" style={{ ['--sf' as string]: STATUS_FARGE[status] }}>{STATUS_NAVN[status]}</span>}
    </span>
  );
}

/**
 * Kundeoversikt: selskapene teamet har markert som kunde eller prospekt, med det som er aktuelt for hver,
 * pluss kommende sakslister og blåreseptsaker for alle selskaper.
 */
export function KundeOversikt() {
  const { data: marked } = useLat<MarkedData>('/api/marked');
  const { data: acc } = useLat<AccessData>('/api/access');
  const { data: kunder } = useKunder();
  const [filter, setFilter] = useState<'alle' | KundeStatus>('alle');

  // Koble et firmanavn eller en metode til et selskap i markedsdataene
  const finnSelskap = useMemo(() => {
    const liste = (marked?.selskaper || []).map((s) => ({ s, rx: rxAv(s.match) }));
    const register = new Map((acc?.emaRegister || []).map((r) => [r.n.toLowerCase(), r.i || '']));
    return (tekst?: string, merke?: string) => {
      const kandidat = [tekst, merke ? register.get(merke.toLowerCase()) : undefined].filter(Boolean) as string[];
      for (const t of kandidat) { const f = liste.find((x) => x.rx && x.rx.test(t)); if (f) return f.s; }
      return undefined;
    };
  }, [marked, acc]);

  const rader = useMemo(() => {
    if (!marked || !acc || !kunder) return [];
    return marked.selskaper.filter((s) => kunder.kunder[s.nokkel]?.status).map((s) => {
      const k = kunder.kunder[s.nokkel];
      const metoder = selskapsMetoder(s, acc);
      const vurdering = metoder.filter(([, m]) => underVurdering(m)).length;
      return { s, k, vurdering, saksliste: sakslisteTreff(s, acc), bla: blaresept(s, acc).saker.filter((b) => !b.avsluttet) };
    }).sort((a, b) => b.saksliste.length - a.saksliste.length || (b.k.notater[0]?.dato || '').localeCompare(a.k.notater[0]?.dato || ''));
  }, [marked, acc, kunder]);

  const kommende = useMemo(() => (acc ? kommendeSakslister(acc) : []), [acc]);

  if (!marked || !acc) return <p className="laster"><span className="spinner" /> Laster …</p>;
  const vis = rader.filter((x) => filter === 'alle' || x.k.status === filter);
  const telle = (st: KundeStatus) => rader.filter((x) => x.k.status === st).length;
  const blaSaker = acc.blaresept?.status || [];

  return (
    <>
      {kunder && !kunder.aktivert && (
        <div className="forklaringsboks">
          <p className="eyebrow">Kundestatus og notater er ikke slått på ennå</p>
          <p>Når lagringen er koblet til i Vercel (Storage, Create, Blob, Private), kan dere markere selskaper som kunde eller prospekt i Selskapsradaren, og de dukker opp her. Sakslister og blå resept under fungerer allerede.</p>
        </div>
      )}
      {kunder?.aktivert && (
        <>
          <div className="stats kompakt">
            <Stat tall={telle('kunde')} etikett="kunder" />
            <Stat tall={telle('prospekt')} etikett="prospekter" />
            <Stat tall={rader.reduce((a, x) => a + x.saksliste.length, 0)} etikett="saker på kommende sakslister" hint="for markerte selskaper" />
            <Stat tall={rader.reduce((a, x) => a + x.bla.length, 0)} etikett="blåreseptsaker hos DMP" hint="for markerte selskaper" />
          </div>
          <Seksjon tittel="Kunder og prospekter">
            <div className="lokale-filtre">
              <Segment etikett="Vis" verdi={filter} sett={setFilter} valg={[{ id: 'alle', navn: 'Alle markerte' }, { id: 'kunde', navn: 'Kunder' }, { id: 'prospekt', navn: 'Prospekter' }, { id: 'tidligere', navn: 'Tidligere kunder' }]} />
            </div>
            {vis.length === 0 ? (
              <p className="tomt">Ingen selskaper er markert ennå. Åpne et selskap i Selskapsradaren og velg «Kunde» eller «Prospekt».</p>
            ) : (
              <table className="tabell">
                <thead><tr><th>Selskap</th><th>Ansvarlig hos WA</th><th>Nå</th><th>Siste notat</th></tr></thead>
                <tbody>{vis.map(({ s, k, vurdering, saksliste, bla }) => (
                  <tr key={s.nokkel}>
                    <td><SelskapNavn s={s} status={k.status} />{k.kontakt && <div className="dempet liten-tekst">Kontakt: {k.kontakt}</div>}</td>
                    <td className="liten-tekst">{k.ansvarlig || <span className="dempet">Ikke satt</span>}</td>
                    <td className="liten-tekst">
                      {saksliste.map((t, i) => <div key={i} className="signal oransje">På sakslisten {datoKort(t.dato)}: {t.tittel.split(/\s+(?:til|som|i kombinasjon)\s/)[0]}</div>)}
                      {bla.map((b, i) => <div key={i} className="signal bla">Blå resept: {b.preparat}, {b.status?.toLowerCase()}</div>)}
                      {vurdering > 0 && <div>{vurdering} {vurdering === 1 ? 'metode' : 'metoder'} under vurdering i Nye metoder</div>}
                      {!saksliste.length && !bla.length && !vurdering && <span className="dempet">Ingenting akkurat nå</span>}
                    </td>
                    <td className="liten-tekst">{k.notater[0] ? <>{k.notater[0].tekst.slice(0, 140)}{k.notater[0].tekst.length > 140 ? ' …' : ''}<div className="dempet">{k.notater[0].av} · {datoKort(k.notater[0].dato)}</div></> : <span className="dempet">Ingen</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Seksjon>
        </>
      )}

      <div className="rutenett-2">
        <Seksjon tittel="Kommende sakslister i Nye metoder">
          {kommende.length === 0 ? (
            <p className="tomt">Ingen sakslister for kommende møter er publisert ennå. De kommer cirka en uke før møtet{acc.moteplan?.beslutningsforum.find((d) => d >= new Date().toISOString().slice(0, 10)) ? ` (neste møte ${datoKort(acc.moteplan.beslutningsforum.find((d) => d >= new Date().toISOString().slice(0, 10))!)})` : ''}.</p>
          ) : kommende.map(({ forum, mote }) => (
            <div key={forum + mote.dato} className="mote">
              <h4>{forum} {datoKort(mote.dato)} {mote.dokumenter.saksliste && <a className="lenkeknapp liten" href={mote.dokumenter.saksliste} target="_blank" rel="noreferrer">Saksliste (PDF)</a>}</h4>
              <ul className="kortliste">{mote.sakslisteSaker!.map((x, i) => {
                const merke = /\(([^)]+)\)/.exec(x.tittel)?.[1];
                const sel = finnSelskap(acc.metoder?.[x.ider[0]]?.selskap, merke);
                const st = sel ? kunder?.kunder[sel.nokkel]?.status : undefined;
                return (
                  <li key={i} className={st === 'kunde' || st === 'prospekt' ? 'uthevet' : ''}>
                    <b>{x.ider.join(', ')}</b> {x.tittel.slice(0, 160)}{x.tittel.length > 160 ? ' …' : ''}
                    {sel && <div><SelskapNavn s={sel} status={st} /></div>}
                  </li>
                );
              })}</ul>
            </div>
          ))}
        </Seksjon>
        <Seksjon tittel={`Blå resept: saker hos DMP (${blaSaker.length})`}>
          {blaSaker.length === 0 ? <p className="tomt">Ingen data fra DMP ennå.</p> : (
            <ul className="kortliste">{[...blaSaker].sort((a, b) => Number(!!a.avsluttet) - Number(!!b.avsluttet) || (b.akseptert || '').localeCompare(a.akseptert || '')).map((b, i) => {
              const sel = finnSelskap(b.firma, b.preparat);
              const st = sel ? kunder?.kunder[sel.nokkel]?.status : undefined;
              return (
                <li key={i} className={st === 'kunde' || st === 'prospekt' ? 'uthevet' : ''}>
                  <b>{b.preparat}</b> · {b.sykdom} · <em>{b.status}</em>{b.avsluttet ? ` ${datoKort(b.avsluttet)}` : ''}
                  <div className="dempet liten-tekst">{sel ? <SelskapNavn s={sel} status={st} /> : b.firma}{BLA_STATUS_FORKLARING[b.status || ''] ? ` · ${BLA_STATUS_FORKLARING[b.status || '']}` : ''}{b.dager ? ` · ${b.dager} dager hos DMP` : ''}</div>
                </li>
              );
            })}</ul>
          )}
          {acc.blaresept && <p className="dempet liten-tekst">Kilde: <a href={acc.blaresept.kilde} target="_blank" rel="noreferrer">DMPs saksbehandlingsstatus for folketrygden</a>. Klokkestopp betyr at DMP venter på firmaet.</p>}
        </Seksjon>
      </div>
    </>
  );
}
