'use client';
import { useEffect, useMemo, useState } from 'react';
import { Seksjon, Stat } from '../felles';
import { useLat } from './Innspill';
import { Overvaking } from './Overvaking';
import { datoKort } from '@/lib/analyse';
import type { AccessData, MarkedData, Overvakingsliste, Selskap } from '@/lib/types';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rxAv = (s?: string) => { try { return s ? new RegExp(s, 'i') : null; } catch { return null; } };
const BSF: Record<string, string> = { innfort: 'Innført', 'ikke-innfort': 'Ikke innført', utsatt: 'Utsatt', annet: 'Annet' };
const BF: Record<string, string> = { full: 'Full metodevurdering bestilt', forenklet: 'Forenklet vurdering bestilt', prisnotat: 'Prisnotat bestilt', 'ikke-oppdrag': 'Ikke oppdrag', utsatt: 'Utsatt', avsluttet: 'Avsluttet', opprettholdt: 'Oppdrag opprettholdt', orientering: 'Orientering', annet: 'Annet' };
const EMA_NAVN: Record<string, string> = { opinion: 'Positiv CHMP-opinion', godkjent: 'Markedsføringstillatelse', avslag: 'Avslag', trukket: 'Søknad trukket' };
const LAGRE = 'selskapsradar-ekstra';

/** Rent søkenavn for selskapet: «Roche Norge» → «Roche», «Novo Nordisk Norway» → «Novo Nordisk». */
const sokenavn = (s: Selskap) => s.navn.replace(/\(.*?\)/g, '').replace(/\b(Norge|Norway|Nordic|Nordics|Scandinavia|AS|ASA|NUF)\b/gi, '').replace(/\s+/g, ' ').trim();

/**
 * Selskapsradar: velg et selskap og få alt samlet automatisk – metoder i Nye metoder, EMA-saker, pipeline,
 * og treff i Stortinget, regjeringen, høringsinnspill, debatter og nyheter på selskapsnavnet og legemidlene deres.
 */
export function Selskapsradar() {
  const { data: marked } = useLat<MarkedData>('/api/marked');
  const { data: acc } = useLat<AccessData>('/api/access');
  const [valgt, setValgt] = useState('');
  const [ekstra, setEkstra] = useState('');

  const selskaper = useMemo(() => [...(marked?.selskaper || [])].sort((a, b) => a.navn.localeCompare(b.navn, 'nb')), [marked]);
  const s = selskaper.find((x) => x.nokkel === valgt);
  useEffect(() => { if (!valgt && selskaper.length) setValgt(selskaper.find((x) => /^roche norge/i.test(x.navn))?.nokkel || selskaper[0].nokkel); }, [selskaper, valgt]);
  // Egne søkeord per selskap huskes i nettleseren
  useEffect(() => {
    if (!valgt) return;
    try { setEkstra(JSON.parse(localStorage.getItem(LAGRE) || '{}')[valgt] || ''); } catch { setEkstra(''); }
  }, [valgt]);
  const lagreEkstra = (v: string) => {
    setEkstra(v);
    try { const m = JSON.parse(localStorage.getItem(LAGRE) || '{}'); m[valgt] = v; localStorage.setItem(LAGRE, JSON.stringify(m)); } catch { /* ikke kritisk */ }
  };

  const r = useMemo(() => {
    if (!s || !acc) return null;
    const rx = rxAv(s.match);
    const register = (acc.emaRegister || []).filter((x) => rx && rx.test(x.i || ''));
    const merker = [...new Set(register.filter((x) => /authorised|opinion/i.test(x.s || '')).map((x) => x.n).filter((n) => n && n.length >= 4))];
    const metoder = Object.entries(acc.metoder || {}).filter(([, m]) => rx && m.selskap && rx.test(m.selskap))
      .sort((a, b) => (b[1].h.at(-1)?.d || '').localeCompare(a[1].h.at(-1)?.d || ''));
    const ema = (acc.ema || []).filter((e) => rx && rx.test(e.innehaver || ''));
    const egne = ekstra.split(',').map((x) => x.trim()).filter(Boolean);
    const ord = [esc(sokenavn(s)) + '\\b', ...merker.map((m) => esc(m) + '\\b'), ...egne];
    const liste: Overvakingsliste = { id: `selskap-${s.nokkel}`, navn: s.navn, ord };
    return { merker, metoder, ema, liste };
  }, [s, acc, ekstra]);

  if (!marked || !acc) return <p className="laster"><span className="spinner" /> Laster selskaper …</p>;
  return (
    <>
      <p className="ingress">
        Velg et selskap, så samles alt automatisk: metodene deres i Nye metoder, saker hos EMA, pipeline – og alle treff på selskapsnavnet og legemidlene deres
        i Stortinget, regjeringen, høringsinnspill, debatter og nyheter. Du trenger ikke sette opp søkeord selv.
      </p>
      <div className="lokale-filtre">
        <label className="velger">
          <span className="eyebrow">Selskap</span>
          <select value={valgt} onChange={(e) => setValgt(e.target.value)}>
            {marked.sektorer.map((sek) => (
              <optgroup key={sek.id} label={sek.navn}>
                {selskaper.filter((x) => x.sektor === sek.id).map((x) => <option key={x.nokkel} value={x.nokkel}>{x.navn}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <input className="sokefelt" placeholder="Egne søkeord, kommaseparert – f.eks. «Eurneffy, anafylaksi»" value={ekstra} onChange={(e) => lagreEkstra(e.target.value)} />
      </div>
      {s && r && (
        <>
          <div className="radar-hode">
            {s.logo ? <img className="logo" src={s.logo} alt="" width={56} height={56} /> : null}
            <div>
              <h2>{s.navn}</h2>
              <p className="dempet liten-tekst">
                {s.orgnr ? <>{s.ansatte ?? '–'} ansatte i Norge · omsetning {s.regnskap?.[0]?.omsetning != null ? `${Math.round(s.regnskap[0].omsetning / 1e6).toLocaleString('nb-NO')} mill. ${s.regnskap[0].valuta !== 'NOK' ? s.regnskap[0].valuta : 'kr'} (${s.regnskap[0].aar})` : '–'}</> : 'Ingen norsk enhet registrert'}
              </p>
            </div>
          </div>
          <div className="stats kompakt">
            <Stat tall={r.metoder.length} etikett="metoder i Nye metoder" />
            <Stat tall={r.ema.length} etikett="EMA-saker siste to år" />
            <Stat tall={s.studier?.length ?? 0} etikett="fase 3-studier pågår" hint={`${s.studier?.filter((x) => x.norge).length ?? 0} med norske sentre`} />
            <Stat tall={r.merker.length} etikett="godkjente legemidler i EU" hint="brukes som søkeord" />
          </div>
          <div className="rutenett-2">
            <Seksjon tittel={`Nye metoder (${r.metoder.length})`}>
              {r.metoder.length === 0 ? <p className="tomt">Ingen metoder funnet for selskapet.</p> : (
                <ul className="kortliste">
                  {r.metoder.slice(0, 15).map(([id, m]) => {
                    const siste = m.h.at(-1)!;
                    return <li key={id}><time>{datoKort(siste.d)}</time> <b>{id}</b> {m.tittel.slice(0, 110)}{m.tittel.length > 110 ? ' …' : ''} – <em>{siste.f === 'bsf' ? `Beslutningsforum: ${BSF[siste.s] || siste.s}` : `Bestillerforum: ${BF[siste.s] || siste.s}`}</em></li>;
                  })}
                </ul>
              )}
            </Seksjon>
            <Seksjon tittel={`EMA siste to år (${r.ema.length})`}>
              {r.ema.length === 0 ? <p className="tomt">Ingen.</p> : (
                <ul className="kortliste">{r.ema.slice(0, 15).map((e, i) => <li key={i}><time>{datoKort(e.dato)}</time> <a href={e.url} target="_blank" rel="noreferrer">{e.navn}</a> – {EMA_NAVN[e.type]} · {e.omrade.slice(0, 2).join(', ')}</li>)}</ul>
              )}
            </Seksjon>
          </div>
          {!!s.studier?.length && (
            <Seksjon tittel={`Pipeline – fase 3 (${s.studier.length})`}>
              <ul className="kortliste">
                {[...s.studier].sort((a, b) => Number(!!b.norge) - Number(!!a.norge)).slice(0, 12).map((x) => (
                  <li key={x.id}>{x.norge && <b className="norge">NO </b>}<a href={`https://clinicaltrials.gov/study/${x.id}`} target="_blank" rel="noreferrer">{x.legemiddel.join(', ') || x.id}</a> – {x.tilstand.join(', ')}{x.ferdig ? ` · ferdig ${x.ferdig.slice(0, 7)}` : ''}</li>
                ))}
              </ul>
            </Seksjon>
          )}
          <Seksjon tittel="Omtale i politikken og mediene">
            <p className="dempet liten-tekst">Søker på «{sokenavn(s)}»{r.merker.length ? ` og ${r.merker.length} legemiddelnavn (${r.merker.slice(0, 6).join(', ')}${r.merker.length > 6 ? ' …' : ''})` : ''}{ekstra ? ` pluss egne søkeord` : ''}.</p>
            <Overvaking fast={r.liste} />
          </Seksjon>
        </>
      )}
    </>
  );
}
