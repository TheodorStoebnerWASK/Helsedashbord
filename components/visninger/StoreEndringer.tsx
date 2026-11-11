'use client';
import { useMemo, useState } from 'react';
import { useData, Seksjon, ElementListe, Chips } from '../felles';
import { Graf } from '../Graf';
import { kategoriOverTid, perTema } from '@/lib/byggere';
import { TYPE_NAVN, type ElementType } from '@/lib/types';

export function StoreEndringer() {
  const c = useData();
  const alle = useMemo(() => c.filtrert.filter((e) => e.storEndring), [c.filtrert]);
  const [typer, setTyper] = useState<ElementType[]>([]);
  const liste = typer.length ? alle.filter((e) => typer.includes(e.type)) : alle;
  const tid = useMemo(() => kategoriOverTid(liste, c, { id: 'store-tid', tittel: 'Signaler om store endringer per måned', undertittel: 'Lovendringer, forskrifter, reformer, nye finansieringsmodeller, prioriteringer m.m.' }), [liste, c]);
  const tema = useMemo(() => perTema(liste, c, { id: 'store-tema', tittel: 'Store endringer per tema', topp: 12 }), [liste, c]);
  const finnes = (['regjering', 'sak', 'horing', 'skriftlig', 'muntlig', 'interpellasjon'] as ElementType[]).filter((t) => alle.some((e) => e.type === t));
  return (
    <>
      <div className="infoboks bred forklaring">
        <h3>Hva er «store endringer»?</h3>
        <p>
          Et filter som plukker ut sakene som kan <em>endre rammevilkårene</em> på helsefeltet, ikke enkeltspørsmål om én pasient eller ett lokalt tilbud.
          Det er sakene du bør vite om før de blir vedtatt.
        </p>
        <ul>
          <li><strong>Regelverk:</strong> lovforslag, lovendringer, nye eller endrede forskrifter.</li>
          <li><strong>Prioritering og pris:</strong> terskelverdier, betalingsvilje, alvorlighetskriterier.</li>
          <li><strong>Struktur:</strong> reformer, nedleggelser, omorganisering, avvikling av tilbud.</li>
          <li><strong>Finansiering:</strong> nye finansieringsordninger og -modeller.</li>
          <li><strong>Utredninger og planer:</strong> NOU-er, stortingsmeldinger, nasjonale strategier og handlingsplaner som varsler endringer.</li>
        </ul>
        <p className="dempet">
          Under hver sak står <em>hvorfor</em> den er flagget. «Nøkkelord: …» betyr at et ord i teksten utløste flagget. Det gir noen falske treff,
          for eksempel et spørsmål som bare nevner en reform. Når KI-klassifiseringen er i gang, vurderer KI-en hver sak og gir en kort begrunnelse.
          Nøkkelordene redigeres i <code>config/taksonomi.json</code>.
        </p>
      </div>
      <div className="rutenett-2">
        <Graf spec={tid} />
        <Graf spec={tema} />
      </div>
      <Seksjon tittel={`Store endringer (${liste.length})`}>
        <Chips valg={finnes.map((t) => ({ id: t, navn: t === 'regjering' ? 'Regjeringen' : TYPE_NAVN[t] }))} valgt={typer} sett={setTyper} />
        <ElementListe liste={liste} />
      </Seksjon>
    </>
  );
}
