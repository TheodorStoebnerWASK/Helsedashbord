'use client';
// Delt kundestatus og notater (lagret i Vercel Blob via /api/kunder).
import { useCallback, useEffect, useState } from 'react';
import { datoKort } from '@/lib/analyse';
import type { KundeData, KundeInfo, KundeStatus } from '@/lib/types';

export const STATUS_NAVN: Record<KundeStatus, string> = { kunde: 'Kunde', prospekt: 'Prospekt', tidligere: 'Tidligere kunde' };
export const STATUS_FARGE: Record<KundeStatus, string> = { kunde: '#2E9E6E', prospekt: '#2F86B8', tidligere: '#8A877F' };
const NAVN = 'wa-helse-navn';

let delt: KundeData | null = null;
const lyttere = new Set<(d: KundeData) => void>();
const sett = (d: KundeData) => { delt = d; lyttere.forEach((f) => f(d)); };

/** Henter kundestatus én gang og deler den mellom profilen og oversikten. */
export function useKunder() {
  const [data, setData] = useState<KundeData | null>(delt);
  const [feil, setFeil] = useState('');
  useEffect(() => {
    lyttere.add(setData);
    if (!delt) fetch('/api/kunder').then((r) => r.json()).then(sett).catch(() => setFeil('Kunne ikke hente kundestatus.'));
    return () => { lyttere.delete(setData); };
  }, []);
  const lagre = useCallback(async (nokkel: string, endring: { felt?: Partial<Pick<KundeInfo, 'status' | 'kontakt' | 'ansvarlig'>> | { status: '' }; notat?: string; slettNotat?: string }) => {
    let av = '';
    try { av = localStorage.getItem(NAVN) || ''; } catch { /* ok */ }
    const r = await fetch('/api/kunder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nokkel, av, ...endring }) });
    const svar = await r.json().catch(() => ({}));
    if (!r.ok) { setFeil(svar.feil || 'Kunne ikke lagre.'); return false; }
    setFeil('');
    if (delt) sett({ ...delt, kunder: { ...delt.kunder, [nokkel]: svar.kunde } });
    return true;
  }, []);
  return { data, lagre, feil };
}

function Navnefelt() {
  const [navn, setNavn] = useState('');
  useEffect(() => { try { setNavn(localStorage.getItem(NAVN) || ''); } catch { /* ok */ } }, []);
  return (
    <label className="velger liten">
      <span className="eyebrow">Ditt navn</span>
      <input value={navn} placeholder="Vises på notatene dine" onChange={(e) => { setNavn(e.target.value); try { localStorage.setItem(NAVN, e.target.value); } catch { /* ok */ } }} />
    </label>
  );
}

/** Status, kontaktperson, ansvarlig hos WA og notater for ett selskap. */
export function KundeKort({ nokkel }: { nokkel: string }) {
  const { data, lagre, feil } = useKunder();
  const k = data?.kunder[nokkel];
  const [kontakt, setKontakt] = useState('');
  const [ansvarlig, setAnsvarlig] = useState('');
  const [notat, setNotat] = useState('');
  const [lagrer, setLagrer] = useState(false);
  useEffect(() => { setKontakt(k?.kontakt || ''); setAnsvarlig(k?.ansvarlig || ''); }, [nokkel, k?.kontakt, k?.ansvarlig]);

  if (!data) return <p className="laster"><span className="spinner" /> Henter kundestatus …</p>;
  if (!data.aktivert) return (
    <div className="forklaringsboks">
      <p className="eyebrow">Kundestatus og notater er ikke slått på ennå</p>
      <p>Notatene lagres privat i Vercel, ikke i det offentlige repoet. For å slå det på: åpne prosjektet i Vercel, gå til <b>Storage</b>, velg <b>Create</b> og <b>Blob</b>, velg <b>Private</b> og koble lagringen til prosjektet. Deretter en ny utrulling (Redeploy).</p>
    </div>
  );
  const status = k?.status;
  return (
    <div className="kundekort">
      <div className="kundekort-topp">
        <div className="segment" role="group" aria-label="Kundestatus">
          {(['kunde', 'prospekt', 'tidligere'] as KundeStatus[]).map((s) => (
            <button key={s} className={status === s ? 'på' : ''} style={status === s ? { background: STATUS_FARGE[s], color: '#fff' } : undefined}
              onClick={() => lagre(nokkel, { felt: { status: status === s ? '' : s } as { status: '' } })}>{STATUS_NAVN[s]}</button>
          ))}
        </div>
        <label className="velger liten">
          <span className="eyebrow">Kontaktperson hos selskapet</span>
          <input value={kontakt} placeholder="Navn, rolle" onChange={(e) => setKontakt(e.target.value)} onBlur={() => kontakt !== (k?.kontakt || '') && lagre(nokkel, { felt: { kontakt } })} />
        </label>
        <label className="velger liten">
          <span className="eyebrow">Ansvarlig hos WA</span>
          <input value={ansvarlig} placeholder="Hvem følger opp" onChange={(e) => setAnsvarlig(e.target.value)} onBlur={() => ansvarlig !== (k?.ansvarlig || '') && lagre(nokkel, { felt: { ansvarlig } })} />
        </label>
        <Navnefelt />
      </div>
      <form className="notat-ny" onSubmit={async (e) => { e.preventDefault(); if (!notat.trim()) return; setLagrer(true); if (await lagre(nokkel, { notat })) setNotat(''); setLagrer(false); }}>
        <textarea value={notat} rows={2} placeholder="Nytt notat, for eksempel «Møte med markedsadgang 12. des., de vurderer ny pris på Itovebi»" onChange={(e) => setNotat(e.target.value)} />
        <button className="knapp" disabled={lagrer || !notat.trim()}>{lagrer ? 'Lagrer …' : 'Legg til notat'}</button>
      </form>
      {feil && <p className="feilmelding">{feil}</p>}
      {k?.notater?.length ? (
        <ul className="notater">
          {k.notater.map((n) => (
            <li key={n.id}>
              <p>{n.tekst}</p>
              <span className="dempet liten-tekst">{n.av} · {datoKort(n.dato)} <button className="lenkeknapp liten" onClick={() => confirm('Slette notatet?') && lagre(nokkel, { slettNotat: n.id })}>Slett</button></span>
            </li>
          ))}
        </ul>
      ) : <p className="dempet liten-tekst">Ingen notater ennå. Notatene er synlige for alle som er logget inn på WA Helse.</p>}
    </div>
  );
}
