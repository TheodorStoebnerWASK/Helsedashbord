// Minimal xlsx-leser: et regneark er en zip med XML. Vi pakker ut med «unzip» (finnes på GitHub Actions)
// og leser første ark som rader med tekst. Lenker (hyperlenker) tas med der de finnes.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { avkod } from './nett.mjs';

const kol = (ref) => [...ref.replace(/\d+/g, '')].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;

export function lesXlsx(buf, ark = 1) {
  const dir = mkdtempSync(join(tmpdir(), 'xlsx-'));
  const fil = join(dir, 'fil.xlsx');
  writeFileSync(fil, buf);
  const pakk = (sti) => { try { return execFileSync('unzip', ['-p', fil, sti], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8'); } catch { return ''; } };
  try {
    const delte = [...pakk('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => avkod([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    const xml = pakk(`xl/worksheets/sheet${ark}.xml`);
    const rels = Object.fromEntries([...pakk(`xl/worksheets/_rels/sheet${ark}.xml.rels`).matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], avkod(m[2])]));
    const lenker = Object.fromEntries([...xml.matchAll(/<hyperlink [^>]*ref="([A-Z]+\d+)"[^>]*r:id="([^"]+)"/g)].map((m) => [m[1], rels[m[2]]]));
    const rader = [];
    for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const rad = [];
      const lenkeRad = {};
      for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const i = kol(c[1]);
        const type = /t="(\w+)"/.exec(c[2])?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] || '')?.[1];
        const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] || '')?.[1];
        rad[i] = type === 's' ? delte[Number(v)] : type === 'inlineStr' ? avkod(inline || '') : v != null ? avkod(v) : '';
        if (lenker[c[1]]) lenkeRad[i] = lenker[c[1]];
      }
      rader.push({ celler: Array.from(rad, (x) => (x ?? '').replace(/[​ ]/g, ' ').trim()), lenker: lenkeRad });
    }
    return rader;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Excel lagrer datoer som antall dager siden 1900. */
export function excelDato(v) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const n = Number(v);
  if (!Number.isFinite(n) || n < 20000) return null;
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
}
