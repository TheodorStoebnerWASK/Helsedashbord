'use client';
import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { lagEchartsOpsjon, kopierBilde, lastNed, lagPowerPoint, filnavn, type GrafSpec } from '@/lib/graf';
import { useSamling } from './Samling';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

export function Graf({ spec, hoyde, kontroller }: { spec: GrafSpec; hoyde?: number; kontroller?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const [melding, setMelding] = useState('');
  const [tabell, setTabell] = useState(false);
  const samling = useSamling();
  const autoHoyde = hoyde ?? (spec.form === 'liggende' ? Math.max(180, spec.kategorier.length * 28 + (spec.serier.length > 1 ? 60 : 30)) : 300);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    // Tegn på nytt når fontene er lastet, så canvas bruker DM Sans
    document.fonts?.ready.then(() => inst.current?.setOption(lagEchartsOpsjon(spec), true));
    return () => { ro.disconnect(); inst.current?.dispose(); inst.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    inst.current?.setOption(lagEchartsOpsjon(spec), true);
  }, [spec]);

  const vis = (m: string) => { setMelding(m); setTimeout(() => setMelding(''), 2200); };
  const png = () => inst.current!.getDataURL({ type: 'png', pixelRatio: 3, backgroundColor: '#FFFFFF' });
  const tom = spec.serier.every((s) => s.data.every((v) => !v));

  return (
    <figure className="graf">
      <figcaption className="graf-hode">
        <div>
          <h3>{spec.tittel}</h3>
          {spec.undertittel && <p className="dempet">{spec.undertittel}</p>}
        </div>
        <div className="graf-verktoy" role="toolbar" aria-label="Eksporter graf">
          <button title="Kopier som bilde – lim rett inn i PowerPoint" onClick={async () => {
            try { await kopierBilde(png()); vis('Kopiert – lim inn i PowerPoint'); } catch { lastNed(png(), `${filnavn(spec.tittel)}.png`); vis('Lastet ned som PNG'); }
          }}>Kopier</button>
          <button title="Last ned PNG i høy oppløsning" onClick={() => lastNed(png(), `${filnavn(spec.tittel)}.png`)}>PNG</button>
          <button title="Last ned som redigerbar PowerPoint-graf" onClick={async () => { vis('Lager PowerPoint …'); await lagPowerPoint([spec], spec.tittel); vis('PowerPoint lastet ned'); }}>PPT</button>
          <button
            title="Legg til i samlet presentasjon"
            className={samling.har(spec.id) ? 'aktiv' : ''}
            onClick={() => { if (samling.har(spec.id)) { samling.fjern(spec.id); vis('Fjernet fra presentasjonen'); } else { samling.leggTil(spec); vis('Lagt til i presentasjonen'); } }}
          >{samling.har(spec.id) ? '✓ Presentasjon' : '+ Presentasjon'}</button>
          <button title="Vis tallene som tabell" className={tabell ? 'aktiv' : ''} onClick={() => setTabell(!tabell)}>Tabell</button>
        </div>
      </figcaption>
      {kontroller && <div className="graf-kontroller">{kontroller}</div>}
      <div ref={ref} style={{ height: autoHoyde, width: '100%', display: tabell || tom ? 'none' : 'block' }} />
      {tom && !tabell && <p className="tomt">Ingen treff med valgte filtre.</p>}
      {tabell && (
        <div className="tabell-wrap">
          <table className="tabell">
            <thead><tr><th></th>{spec.serier.map((s) => <th key={s.navn}>{s.navn}</th>)}</tr></thead>
            <tbody>
              {spec.kategorier.map((k, i) => (
                <tr key={k}><td>{k}</td>{spec.serier.map((s) => <td key={s.navn} className="tall">{s.data[i]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {melding && <div className="toast" role="status">{melding}</div>}
    </figure>
  );
}
