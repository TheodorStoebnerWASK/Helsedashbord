// Henter voteringer fra Stortinget og regner ut hvert partis standpunkt per votering.
// Ferdigbehandlede saker endres ikke, så de lagres i data/voteringer.json og hentes bare én gang.
const VOTERING = { 1: 'borte', 2: 'for', 3: 'mot' };

/**
 * @param saker [{id, sesjon}] – ferdigbehandlede saker
 * @param cache {sakId: {v: [...] }}  (muteres)
 * @returns antall nye saker hentet
 */
export async function hentVoteringer(saker, cache, { sth, logg, maksNye = 2000, parallelt = 6 }) {
  const nye = saker.filter((s) => !cache[s.id]).slice(0, maksNye);
  if (!nye.length) return 0;
  logg(`Voteringer: henter ${nye.length} nye saker`);
  let ferdig = 0;
  const kø = [...nye];
  async function arbeider() {
    while (kø.length) {
      const sak = kø.shift();
      try {
        const liste = (await sth(`voteringer?sakid=${sak.id}`)).sak_votering_liste || [];
        const v = [];
        for (const vot of liste) {
          // Bare personlige voteringer har stemmer per representant. Enstemmige vedtak uten
          // navneopprop har ikke det, og tas ikke med (de ville blåst opp enigheten).
          if (!vot.personlig_votering) continue;
          const res = (await sth(`voteringsresultat?voteringid=${vot.votering_id}`)).voteringsresultat_liste || [];
          const tall = {};
          for (const r of res) {
            const parti = r.representant?.parti?.id;
            const s = VOTERING[r.votering];
            if (!parti || !s || s === 'borte') continue;
            tall[parti] ??= { for: 0, mot: 0 };
            tall[parti][s]++;
          }
          // Partiets standpunkt = flertallet av partiets tilstedeværende representanter. 1 = for, -1 = mot
          const p = {};
          for (const [parti, t] of Object.entries(tall)) if (t.for !== t.mot) p[parti] = t.for > t.mot ? 1 : -1;
          const tema = String(vot.votering_tema || '');
          v.push({
            id: vot.votering_id,
            tid: dato(vot.votering_tid),
            tema: tema.slice(0, 160),
            type: /innstilling|tilråding/i.test(tema) ? 'innstilling' : /forslag/i.test(tema) ? 'forslag' : 'annet',
            vedtatt: vot.vedtatt || undefined,
            p,
          });
        }
        cache[sak.id] = { v };
      } catch (e) {
        logg(`Voteringer: hopper over sak ${sak.id} (${e.message})`);
      }
      if (++ferdig % 100 === 0) logg(`Voteringer: ${ferdig}/${nye.length}`);
    }
  }
  await Promise.all(Array.from({ length: parallelt }, arbeider));
  return nye.length;
}

const dato = (s) => {
  const m = /\/Date\((-?\d+)/.exec(s || '');
  return m && Number(m[1]) > 0 ? new Date(Number(m[1])).toISOString() : undefined;
};
