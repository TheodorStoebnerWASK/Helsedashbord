// Én grafdefinisjon → ECharts (skjerm), PNG (utklippstavle/fil) og innebygd PowerPoint-graf (redigerbar i PPT).
import type { EChartsOption } from 'echarts';

export interface Serie {
  navn: string;
  data: number[];
  farge?: string;
  fargerPerPunkt?: string[]; // f.eks. partifarge per stolpe
}

export interface GrafSpec {
  id: string;
  tittel: string;
  undertittel?: string;
  kilde?: string;
  form: 'stolpe' | 'liggende' | 'linje';
  stablet?: boolean;
  kategorier: string[];
  serier: Serie[];
  enhet?: string;
}

export const WA = {
  ink: '#0A0A0A',
  ink2: '#4A4843',
  muted: '#7D7A74',
  line: '#E4E1D8',
  bg: '#F8F7F3',
  blue: '#3D99C7',
  blueLight: '#D8EBF4',
  pink: '#FFC8D0',
  red: '#FD3B25',
  brown: '#685048',
};
export const FONT = '"DM Sans", system-ui, sans-serif';
const STANDARD_KILDE = 'Kilde: Stortinget (data.stortinget.no) og regjeringen.no. Bearbeidet av Wergeland Apenes.';

export function lagEchartsOpsjon(spec: GrafSpec): EChartsOption {
  const liggende = spec.form === 'liggende';
  const linje = spec.form === 'linje';
  const flere = spec.serier.length > 1;
  const visVerdier = !spec.stablet && !linje && spec.kategorier.length <= 24 && !flere;
  const verdiAkse = {
    type: 'value' as const,
    minInterval: 1,
    axisLabel: { color: WA.muted, fontFamily: FONT, fontSize: 11 },
    splitLine: { lineStyle: { color: WA.line, width: 1 } },
    axisLine: { show: false },
    axisTick: { show: false },
  };
  const katAkse = {
    type: 'category' as const,
    data: spec.kategorier,
    inverse: liggende,
    axisLabel: {
      color: WA.ink2, fontFamily: FONT, fontSize: 12, interval: 0,
      width: liggende ? 170 : undefined, overflow: 'truncate' as const,
      rotate: !liggende && !linje && spec.kategorier.length > 8 ? 35 : 0,
      hideOverlap: linje,
    },
    axisLine: { lineStyle: { color: WA.ink } },
    axisTick: { show: false },
  };
  return {
    animationDuration: 400,
    textStyle: { fontFamily: FONT },
    color: spec.serier.map((s) => s.farge || WA.blue),
    grid: { left: 8, right: visVerdier ? 36 : 16, top: flere ? 40 : 16, bottom: 8, containLabel: true },
    legend: flere ? { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 12, textStyle: { color: WA.ink2, fontFamily: FONT, fontSize: 12 } } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: linje ? 'line' : 'shadow', shadowStyle: { color: 'rgba(10,10,10,0.04)' }, lineStyle: { color: WA.muted } },
      backgroundColor: '#fff', borderColor: WA.line, textStyle: { color: WA.ink, fontFamily: FONT, fontSize: 12 },
      valueFormatter: (v) => `${v}${spec.enhet ? ' ' + spec.enhet : ''}`,
    },
    xAxis: liggende ? verdiAkse : katAkse,
    yAxis: liggende ? katAkse : verdiAkse,
    series: spec.serier.map((s, si) => {
      const sisteStabel = si === spec.serier.length - 1;
      const radius = spec.stablet && !sisteStabel ? 0 : liggende ? [0, 4, 4, 0] : [4, 4, 0, 0];
      if (linje) {
        return {
          type: 'line', name: s.navn, data: s.data, smooth: false, symbol: 'circle', symbolSize: 7, showSymbol: s.data.length <= 30,
          lineStyle: { width: 2, color: s.farge }, itemStyle: { color: s.farge, borderColor: '#fff', borderWidth: 2 },
          emphasis: { focus: 'series' },
          endLabel: flere && spec.serier.length <= 4 ? { show: true, formatter: '{a}', color: WA.ink2, fontFamily: FONT, fontSize: 11 } : undefined,
        };
      }
      return {
        type: 'bar', name: s.navn, stack: spec.stablet ? 'total' : undefined, barMaxWidth: liggende ? 22 : 36, barGap: '12%',
        data: s.data.map((v, i) => ({ value: v, itemStyle: { color: s.fargerPerPunkt?.[i] || s.farge, borderRadius: radius } })),
        itemStyle: spec.stablet ? { borderColor: '#fff', borderWidth: 1 } : undefined,
        label: visVerdier ? { show: true, position: liggende ? 'right' : 'top', color: WA.ink2, fontFamily: FONT, fontSize: 11 } : undefined,
        emphasis: { focus: flere ? 'series' : 'none' },
      };
    }) as EChartsOption['series'],
  };
}

// ---------- PNG ----------
export async function dataUrlTilBlob(url: string) {
  return (await fetch(url)).blob();
}

export async function kopierBilde(dataUrl: string) {
  const blob = await dataUrlTilBlob(dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function lastNed(dataUrl: string, filnavn: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filnavn;
  a.click();
}

export const filnavn = (s: string) =>
  s.toLowerCase().replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// ---------- PowerPoint ----------
let logoPng: string | null = null;
async function hentLogo(farge = '#0A0A0A'): Promise<string> {
  if (logoPng && farge === '#0A0A0A') return logoPng;
  const svg = (await (await fetch('/wa-mark.svg')).text()).replace('currentColor', farge);
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 375 * 2;
  c.height = 202 * 2;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/png');
  if (farge === '#0A0A0A') logoPng = url;
  return url;
}

const hex = (f?: string) => (f || WA.blue).replace('#', '').toUpperCase();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function leggTilGrafSlide(pptx: any, spec: GrafSpec, logo: string) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addText(spec.tittel, { x: 0.6, y: 0.4, w: 12.1, h: 0.7, fontFace: 'DM Sans', fontSize: 28, color: '0A0A0A', margin: 0 });
  if (spec.undertittel)
    slide.addText(spec.undertittel, { x: 0.6, y: 1.08, w: 12.1, h: 0.4, fontFace: 'DM Sans Light', fontSize: 14, color: '4A4843', margin: 0 });

  // Stolper med egen farge per punkt (f.eks. partier) blir én serie per punkt, stablet – da beholder hver stolpe fargen sin og grafen er fortsatt redigerbar.
  let serier = spec.serier;
  let stablet = !!spec.stablet;
  let overlapp = false; // én serie per punkt som ligger oppå hverandre (100 % overlapp) – gir verdier utenfor stolpen
  if (spec.serier.length === 1 && spec.serier[0].fargerPerPunkt && spec.form !== 'linje') {
    const s = spec.serier[0];
    serier = spec.kategorier.map((k, i) => ({
      navn: k, farge: s.fargerPerPunkt![i], data: spec.kategorier.map((_, j) => (j === i ? s.data[i] : 0)),
    }));
    overlapp = true;
  }
  const data = serier.map((s) => ({ name: s.navn, labels: spec.kategorier, values: s.data }));
  const liggende = spec.form === 'liggende';
  const linje = spec.form === 'linje';
  const visLegend = spec.serier.length > 1;
  const visVerdier = !linje && !stablet && spec.kategorier.length <= 24;
  slide.addChart(linje ? pptx.ChartType.line : pptx.ChartType.bar, data, {
    x: 0.6, y: spec.undertittel ? 1.65 : 1.35, w: 12.1, h: spec.undertittel ? 5.0 : 5.3,
    barDir: liggende ? 'bar' : 'col',
    barGrouping: stablet ? 'stacked' : 'clustered',
    barGapWidthPct: overlapp ? 60 : 40,
    barOverlapPct: overlapp ? 100 : undefined,
    chartColors: serier.map((s) => hex(s.farge)),
    catAxisOrientation: liggende ? 'maxMin' : 'minMax',
    valAxisHidden: false,
    catAxisLabelFontFace: 'DM Sans', catAxisLabelFontSize: 11, catAxisLabelColor: '4A4843',
    valAxisLabelFontFace: 'DM Sans', valAxisLabelFontSize: 10, valAxisLabelColor: '8A877F',
    catAxisLineShow: true, catAxisLineColor: '0A0A0A',
    valAxisLineShow: false,
    valGridLine: { color: 'E4E1D8', size: 0.75 },
    catGridLine: { style: 'none' },
    showLegend: visLegend, legendPos: 't', legendFontFace: 'DM Sans', legendFontSize: 11, legendColor: '4A4843',
    showValue: visVerdier, dataLabelFontFace: 'DM Sans', dataLabelFontSize: 10, dataLabelColor: '4A4843',
    dataLabelFormatCode: '#,##0;;', dataLabelPosition: stablet ? 'ctr' : 'outEnd',
    lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 6,
  });
  slide.addText(spec.kilde || STANDARD_KILDE, { x: 0.6, y: 6.95, w: 10, h: 0.3, fontFace: 'DM Sans Light', fontSize: 9, color: '8A877F', margin: 0 });
  slide.addImage({ data: logo, x: 12.3, y: 6.9, w: 0.42, h: 0.226 });
}

export async function lagPowerPoint(specs: GrafSpec[], navn: string, medForside = false) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Wergeland Apenes – Helsepolitisk dashbord';
  pptx.title = navn;
  pptx.theme = { headFontFace: 'DM Sans', bodyFontFace: 'DM Sans Light' };
  if (medForside) {
    const hvit = await hentLogo('#FFFFFF');
    const s = pptx.addSlide();
    s.background = { color: '0A0A0A' };
    s.addText(navn, { x: 0.8, y: 2.6, w: 11.7, h: 1.2, fontFace: 'Source Serif 4 Light', fontSize: 40, color: 'FFFFFF', margin: 0 });
    s.addText(new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), {
      x: 0.8, y: 3.8, w: 8, h: 0.4, fontFace: 'DM Sans', fontSize: 11, color: 'FFFFFF', charSpacing: 2, margin: 0,
    });
    s.addImage({ data: hvit, x: 12.3, y: 6.9, w: 0.42, h: 0.226 });
  }
  const logo = await hentLogo();
  for (const spec of specs) leggTilGrafSlide(pptx, spec, logo);
  await pptx.writeFile({ fileName: `${filnavn(navn)}.pptx` });
}
