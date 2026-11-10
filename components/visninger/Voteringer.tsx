'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useData, Seksjon, Segment, PartiMerke } from '../felles';
import { PARTIER, PARTI_REKKEFOLGE } from '@/lib/parti';
import { FONT, WA, kopierBilde, lastNed, filnavn } from '@/lib/graf';
import { datoKort, sesjonKort } from '@/lib/analyse';
import type { Votering } from '@/lib/types';

echarts.use([HeatmapChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Vis = 'likt' | 'for' | 'mot';
type Type = 'alle' | 'innstilling' | 'forslag';

// Divergerende skala: rød (sjelden) – nøytral grå – grønn (ofte). To kulører, grå midtpunkt.
const SKALA = ['#8E2A22', '#B4473B', '#CF7A6E', '#E4ABA2', '#ECE9E3', '#B9D6C7', '#86B9A0', '#4F9677', '#24694F'];
const tekstPå = (i: number) => (i <= 1 || i >= 7 ? '#FFFFFF' : WA.ink);
const VIS_TEKST: Record<Vis, string> = {
  likt: 'Stemte likt: begge partiene stemte for, eller begge stemte mot.',
  for: 'Stemte for det samme: begge partiene stemte for.',
  mot: 'Stemte mot det samme: begge partiene stemte mot.',
};

export function Voteringer() {
  const { data, filtrert, filtre, temaNavn, katNavn } = useData();
  const [vis, setVis] = useState<Vis>('likt');
  const [type, setType] = useState<Type>('alle');
  const [utvalg, setUtvalg] = useState('helse');
  const [par, setPar] = useState<[string, string] | null>(null);
  const saker = data.voteringSaker || {};

  // Hvilke helsesaker som er med etter globale filtre (sesjon, kategori, søk)
  const synligeHelseSaker = useMemo(() => new Set(filtrert.filter((e) => e.type === 'sak').map((e) => e.id.replace('sak-', ''))), [filtrert]);

  const voteringer = useMemo(() => (data.voteringer || []).filter((v) => {
    const sak = saker[v.s];
    if (!sak) return false;
    if (filtre.sesjon !== 'alle' && sak.sesjon !== filtre.sesjon) return false;
    if (type !== 'alle' && v.ty !== type) return false;
    if (utvalg === 'alle') return true;
    if (!sak.helse || !synligeHelseSaker.has(String(v.s))) return false;
    if (utvalg === 'helse') return true;
    if (utvalg.startsWith('kat:')) return sak.kategori === utvalg.slice(4);
    return !!sak.temaer?.includes(utvalg.slice(5));
  }), [data, saker, filtre.sesjon, type, utvalg, synligeHelseSaker]);

  const partier = useMemo(() => {
    const n: Record<string, number> = {};
    for (const v of data.voteringer || []) for (const p of Object.keys(v.p)) n[p] = (n[p] || 0) + 1;
    return PARTI_REKKEFOLGE.filter((p) => (n[p] || 0) >= 20).sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b));
  }, [data]);

  const matrise = useMemo(() => {
    const m: Record<string, { andel: number; n: number; treff: number }> = {};
    for (const a of partier) for (const b of partier) {
      if (a === b) continue;
      let n = 0, treff = 0;
      for (const v of voteringer) {
        const x = v.p[a], y = v.p[b];
        if (!x || !y) continue;
        n++;
        if (vis === 'likt' ? x === y : vis === 'for' ? x === 1 && y === 1 : x === -1 && y === -1) treff++;
      }
      m[`${a}|${b}`] = { andel: n ? Math.round((treff / n) * 100) : NaN, n, treff };
    }
    return m;
  }, [partier, voteringer, vis]);

  const verdier = Object.values(matrise).map((x) => x.andel).filter((x) => !isNaN(x));
  const min = Math.min(...verdier), max = Math.max(...verdier);
  const trinn = (v: number) => (isNaN(v) || max === min ? 4 : Math.round(((v - min) / (max - min)) * (SKALA.length - 1)));

  const utvalgNavn = utvalg === 'alle' ? 'Alle saker i Stortinget' : utvalg === 'helse' ? 'Helsesaker' : utvalg.startsWith('kat:') ? katNavn(utvalg.slice(4)) : temaNavn(utvalg.slice(5));
  const tittel = `${vis === 'likt' ? 'Hvor ofte partiene stemmer likt' : vis === 'for' ? 'Hvor ofte partiene stemmer for det samme' : 'Hvor ofte partiene stemmer mot det samme'} – ${utvalgNavn.toLowerCase()}`;
  const undertittel = `${voteringer.length} personlige voteringer · ${type === 'alle' ? 'alle voteringer' : type === 'innstilling' ? 'komiteens innstilling' : 'partienes forslag'} · ${filtre.sesjon === 'alle' ? 'stortingsperioden 2025–2029' : 'sesjon ' + sesjonKort(filtre.sesjon)}`;

  // ---------- ECharts heatmap ----------
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const [melding, setMelding] = useState('');
  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current);
    inst.current.on('click', (e) => { const [i, j] = e.value as [number, number]; setPar([partier[i], partier[j]]); });
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); inst.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partier.join()]);
  useEffect(() => {
    const navn = partier.map((p) => PARTIER[p]?.kort || p);
    const celler = [];
    for (let i = 0; i < partier.length; i++) for (let j = 0; j < partier.length; j++) {
      if (i === j) continue;
      const c = matrise[`${partier[i]}|${partier[j]}`];
      const t = trinn(c.andel);
      celler.push({ value: [j, i, isNaN(c.andel) ? '–' : c.andel], itemStyle: { color: SKALA[t], borderColor: '#FFFFFF', borderWidth: 2 }, label: { color: tekstPå(t) } });
    }
    inst.current?.setOption({
      animation: false,
      textStyle: { fontFamily: FONT },
      grid: { left: 60, right: 10, top: 40, bottom: 10 },
      xAxis: { type: 'category', data: navn, position: 'top', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: WA.ink, fontSize: 13, fontFamily: FONT } },
      yAxis: { type: 'category', data: navn, inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: WA.ink, fontSize: 13, fontFamily: FONT } },
      tooltip: {
        backgroundColor: '#fff', borderColor: WA.line, textStyle: { color: WA.ink, fontFamily: FONT, fontSize: 12 },
        formatter: (p: { value: [number, number, number] }) => {
          const a = partier[p.value[1]], b = partier[p.value[0]];
          const c = matrise[`${a}|${b}`];
          return `<b>${PARTIER[a]?.kort} × ${PARTIER[b]?.kort}</b><br/>${c.andel} % (${c.treff} av ${c.n} voteringer)<br/><span style="color:${WA.muted}">Klikk for detaljer</span>`;
        },
      },
      series: [{ type: 'heatmap', data: celler, label: { show: true, fontSize: 14, fontFamily: FONT }, emphasis: { itemStyle: { borderColor: WA.ink, borderWidth: 2 } } }],
    }, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrise, partier]);

  const vis2 = (m: string) => { setMelding(m); setTimeout(() => setMelding(''), 2200); };
  const png = () => inst.current!.getDataURL({ type: 'png', pixelRatio: 3, backgroundColor: '#FFFFFF' });
  const ppt = async () => {
    vis2('Lager PowerPoint …');
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    const s = pptx.addSlide();
    s.addText(tittel, { x: 0.6, y: 0.35, w: 12.1, h: 0.7, fontFace: 'DM Sans', fontSize: 24, color: '0A0A0A', margin: 0 });
    s.addText(undertittel, { x: 0.6, y: 1.0, w: 12.1, h: 0.4, fontFace: 'DM Sans Light', fontSize: 13, color: '4A4843', margin: 0 });
    const navn = partier.map((p) => PARTIER[p]?.kort || p);
    const hode = [{ text: '', options: {} }, ...navn.map((n) => ({ text: n, options: { bold: true, align: 'center' as const } }))];
    const rader = partier.map((a, i) => [
      { text: navn[i], options: { bold: true } },
      ...partier.map((b) => {
        if (a === b) return { text: '', options: { fill: { color: 'F4F2EE' } } };
        const c = matrise[`${a}|${b}`]; const t = trinn(c.andel);
        return { text: isNaN(c.andel) ? '–' : String(c.andel), options: { align: 'center' as const, fill: { color: SKALA[t].slice(1) }, color: tekstPå(t).slice(1) } };
      }),
    ]);
    const bredde = Math.min(10, 0.85 * (partier.length + 1));
    s.addTable([hode, ...rader], { x: (13.33 - bredde) / 2, y: 1.6, w: bredde, colW: Array(partier.length + 1).fill(bredde / (partier.length + 1)), rowH: 0.48, fontFace: 'DM Sans', fontSize: 13, color: '0A0A0A', border: { type: 'solid', color: 'FFFFFF', pt: 2 }, valign: 'middle' });
    s.addText(`Kilde: Stortinget (data.stortinget.no), personlige voteringer. Andel av voteringene der begge partiene tok standpunkt. Bearbeidet av Wergeland Apenes.`, { x: 0.6, y: 6.95, w: 12, h: 0.3, fontFace: 'DM Sans Light', fontSize: 9, color: '8A877F', margin: 0 });
    await pptx.writeFile({ fileName: `${filnavn(tittel)}.pptx` });
    vis2('PowerPoint lastet ned');
  };

  // ---------- Detaljer for valgt par ----------
  const detalj = useMemo(() => {
    if (!par) return null;
    const [a, b] = par;
    const begge = voteringer.filter((v) => v.p[a] && v.p[b]);
    const ulikt = begge.filter((v) => v.p[a] !== v.p[b]).sort((x, y) => String(y.t).localeCompare(String(x.t)));
    return { a, b, begge: begge.length, likt: begge.length - ulikt.length, ulikt };
  }, [par, voteringer]);

  const temaValg = data.taksonomi.temaer.filter((t) => t.id !== 'annet');
  if (!data.voteringer?.length) return <p className="tomt">Voteringsdata er ikke hentet ennå. De kommer ved neste automatiske oppdatering.</p>;

  return (
    <>
      <div className="lokale-filtre">
        <label className="velger">
          <span className="eyebrow">Utvalg</span>
          <select value={utvalg} onChange={(e) => { setUtvalg(e.target.value); setPar(null); }}>
            <option value="helse">Alle helsesaker</option>
            <optgroup label="Kategori">{data.taksonomi.kategorier.map((k) => <option key={k.id} value={`kat:${k.id}`}>{k.navn}</option>)}</optgroup>
            <optgroup label="Tema">{temaValg.map((t) => <option key={t.id} value={`tema:${t.id}`}>{t.navn}</option>)}</optgroup>
            <option value="alle">Alle saker i Stortinget (til sammenligning)</option>
          </select>
        </label>
        <Segment etikett="Vis" verdi={vis} sett={setVis} valg={[{ id: 'likt', navn: 'Stemte likt' }, { id: 'for', navn: 'Stemte for det samme' }, { id: 'mot', navn: 'Stemte mot det samme' }]} />
        <Segment etikett="Voteringer" verdi={type} sett={setType} valg={[{ id: 'alle', navn: 'Alle voteringer' }, { id: 'innstilling', navn: 'Komiteens innstilling' }, { id: 'forslag', navn: 'Partienes forslag' }]} />
      </div>

      <figure className="graf">
        <figcaption className="graf-hode">
          <div>
            <h3>{tittel}</h3>
            <p className="dempet">{undertittel}</p>
          </div>
          <div className="graf-verktoy" role="toolbar" aria-label="Eksporter">
            <button onClick={async () => { try { await kopierBilde(png()); vis2('Kopiert – lim inn i PowerPoint'); } catch { lastNed(png(), `${filnavn(tittel)}.png`); } }}>Kopier</button>
            <button onClick={() => lastNed(png(), `${filnavn(tittel)}.png`)}>PNG</button>
            <button onClick={ppt}>PPT</button>
          </div>
        </figcaption>
        <p className="liten-tekst"><strong>{VIS_TEKST[vis].split(':')[0]}:</strong>{VIS_TEKST[vis].slice(VIS_TEKST[vis].indexOf(':') + 1)} Klikk på en rute for å sammenligne to partier.</p>
        <div ref={ref} className="matrise" style={{ height: Math.max(360, partier.length * 52 + 60) }} />
        <div className="skala" aria-hidden="true">
          <span>Sjelden {vis === 'likt' ? 'likt' : 'sammen'}</span>
          {SKALA.map((f) => <i key={f} style={{ background: f }} />)}
          <span>Oftest {vis === 'likt' ? 'likt' : 'sammen'}</span>
        </div>
        <p className="dempet liten-tekst">
          Tall i ruten: andelen av voteringene der begge partiene tok standpunkt, der de {vis === 'likt' ? 'stemte likt' : vis === 'for' ? 'begge stemte for' : 'begge stemte mot'}.
          Et partis standpunkt er flertallet blant partiets representanter som var til stede. Fargene er relative til utvalget (spennet {min}–{max} %).
          Bare personlige voteringer er med. Enstemmige vedtak uten navneopprop har ikke stemmer per representant.
        </p>
        {melding && <div className="toast" role="status">{melding}</div>}
      </figure>

      {detalj && (
        <Seksjon
          tittel={`${PARTIER[detalj.a]?.kort} × ${PARTIER[detalj.b]?.kort}`}
          hoyre={<button className="lenkeknapp" onClick={() => setPar(null)}>Lukk</button>}
        >
          <p>
            <PartiMerke parti={detalj.a} /> og <PartiMerke parti={detalj.b} /> stemte likt i <b>{detalj.likt}</b> av <b>{detalj.begge}</b> voteringer
            ({detalj.begge ? Math.round((detalj.likt / detalj.begge) * 100) : 0} %). Under er voteringene der de stemte <em>forskjellig</em>, nyeste først.
          </p>
          <ul className="elementer">
            {detalj.ulikt.slice(0, 60).map((v) => <VoteringRad key={v.id} v={v} a={detalj.a} b={detalj.b} />)}
          </ul>
          {detalj.ulikt.length > 60 && <p className="dempet liten-tekst">Viser 60 av {detalj.ulikt.length}.</p>}
        </Seksjon>
      )}
    </>
  );
}

const ORDEN = ['R', 'SV', 'MDG', 'A', 'Sp', 'KrF', 'V', 'H', 'FrP', 'PF'];

function VoteringRad({ v, a, b }: { v: Votering; a: string; b: string }) {
  const { data } = useData();
  const sak = data.voteringSaker?.[v.s];
  const st = (x?: number) => (x === 1 ? 'for' : x === -1 ? 'mot' : '–');
  return (
    <li className="element">
      <div className="element-meta">
        <span className="type">{v.ty === 'innstilling' ? 'Innstilling' : v.ty === 'forslag' ? 'Forslag' : 'Votering'}</span>
        <time>{datoKort(v.t)}</time>
      </div>
      <div className="element-innhold">
        <p className="element-tittel"><a href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${v.s}`} target="_blank" rel="noreferrer">{sak?.tittel}</a></p>
        <div className="element-detaljer">
          {v.tema && <span className="dempet">{v.tema}</span>}
          <span>{PARTIER[a]?.kort} stemte <b>{st(v.p[a])}</b>, {PARTIER[b]?.kort} stemte <b>{st(v.p[b])}</b></span>
        </div>
      </div>
    </li>
  );
}
