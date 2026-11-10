'use client';
// «Presentasjon»: samle flere grafer og last ned som én PowerPoint med WA-forside.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { lagPowerPoint, type GrafSpec } from '@/lib/graf';

interface Ctx {
  specs: GrafSpec[];
  leggTil: (s: GrafSpec) => void;
  fjern: (id: string) => void;
  tom: () => void;
  har: (id: string) => boolean;
}
const SamlingCtx = createContext<Ctx | null>(null);
const NOKKEL = 'wa-helse-samling';

export function SamlingProvider({ children }: { children: ReactNode }) {
  const [specs, setSpecs] = useState<GrafSpec[]>([]);
  useEffect(() => {
    try {
      const s = localStorage.getItem(NOKKEL);
      if (s) setSpecs(JSON.parse(s));
    } catch {}
  }, []);
  const lagre = (s: GrafSpec[]) => {
    setSpecs(s);
    try { localStorage.setItem(NOKKEL, JSON.stringify(s)); } catch {}
  };
  const ctx: Ctx = {
    specs,
    leggTil: (s) => lagre([...specs.filter((x) => x.id !== s.id), s]),
    fjern: (id) => lagre(specs.filter((x) => x.id !== id)),
    tom: () => lagre([]),
    har: (id) => specs.some((x) => x.id === id),
  };
  return <SamlingCtx.Provider value={ctx}>{children}</SamlingCtx.Provider>;
}

export const useSamling = () => useContext(SamlingCtx)!;

export function SamlingKnapp() {
  const { specs, fjern, tom } = useSamling();
  const [apen, setApen] = useState(false);
  const [jobber, setJobber] = useState(false);
  const [navn, setNavn] = useState('Helsepolitisk oversikt');
  return (
    <div className="samling">
      <button className="knapp knapp-lys" onClick={() => setApen(!apen)} aria-expanded={apen}>
        Presentasjon <span className="teller">{specs.length}</span>
      </button>
      {apen && (
        <div className="samling-panel" role="dialog" aria-label="Presentasjon">
          <div className="samling-topp">
            <strong>Grafer i presentasjonen</strong>
            <button className="lenkeknapp" onClick={() => setApen(false)}>Lukk</button>
          </div>
          {specs.length === 0 ? (
            <p className="dempet">Trykk «+ Presentasjon» på en graf for å legge den til. Alle grafene lastes ned som én PowerPoint med redigerbare grafer.</p>
          ) : (
            <>
              <ol className="samling-liste">
                {specs.map((s) => (
                  <li key={s.id}>
                    <span>{s.tittel}</span>
                    <button className="lenkeknapp" onClick={() => fjern(s.id)}>Fjern</button>
                  </li>
                ))}
              </ol>
              <label className="felt">
                <span>Tittel på forsiden</span>
                <input value={navn} onChange={(e) => setNavn(e.target.value)} />
              </label>
              <div className="rad">
                <button
                  className="knapp"
                  disabled={jobber}
                  onClick={async () => { setJobber(true); try { await lagPowerPoint(specs, navn, true); } finally { setJobber(false); } }}
                >
                  {jobber ? 'Lager …' : 'Last ned PowerPoint'}
                </button>
                <button className="lenkeknapp" onClick={tom}>Tøm</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
