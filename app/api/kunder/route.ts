// Kundestatus og notater som hele teamet deler. Lagres som én privat JSON-fil i Vercel Blob,
// så ingenting havner i det offentlige repoet. Ruten ligger bak passordet (middleware).
import { NextResponse } from 'next/server';
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import type { KundeInfo, KundeData } from '@/lib/types';

export const dynamic = 'force-dynamic';
const STI = 'kunder/kunder.json';
const STATUSER = ['kunde', 'prospekt', 'tidligere', ''];
// KUNDER_TESTFIL brukes bare ved lokal testing (ingen Blob-tilgang); i produksjon er den ikke satt.
const TESTFIL = process.env.NODE_ENV !== 'production' || process.env.KUNDER_TESTFIL_TILLAT ? process.env.KUNDER_TESTFIL : undefined;
const aktivert = () => !!(TESTFIL || process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

async function les(): Promise<{ data: Record<string, KundeInfo>; etag?: string }> {
  if (TESTFIL) { const fs = await import('node:fs'); return { data: fs.existsSync(TESTFIL) ? JSON.parse(fs.readFileSync(TESTFIL, 'utf8')) : {} }; }
  const r = await get(STI, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { data: {} };
  return { data: JSON.parse(await new Response(r.stream).text()), etag: r.blob.etag };
}

export async function GET() {
  if (!aktivert()) return NextResponse.json({ aktivert: false, kunder: {} } satisfies KundeData);
  try { return NextResponse.json({ aktivert: true, kunder: (await les()).data } satisfies KundeData); }
  catch (e) { return NextResponse.json({ aktivert: true, kunder: {}, feil: (e as Error).message.slice(0, 200) } satisfies KundeData, { status: 500 }); }
}

const tekst = (v: unknown, maks: number) => (typeof v === 'string' ? v.trim().slice(0, maks) : undefined);

export async function POST(req: Request) {
  if (!aktivert()) return NextResponse.json({ feil: 'Lagring er ikke aktivert' }, { status: 503 });
  const b = await req.json().catch(() => null);
  const nokkel = tekst(b?.nokkel, 40);
  if (!nokkel || !/^[\w-]+$/.test(nokkel)) return NextResponse.json({ feil: 'Ugyldig selskap' }, { status: 400 });
  const av = tekst(b?.av, 60) || 'Ukjent';
  // Les, endre og skriv tilbake. ifMatch hindrer at to samtidige lagringer overskriver hverandre.
  for (let forsok = 0; forsok < 4; forsok++) {
    const { data, etag } = await les();
    const k: KundeInfo = data[nokkel] || { notater: [] };
    if (b.felt) {
      const f = b.felt;
      if (f.status !== undefined && STATUSER.includes(f.status)) k.status = f.status || undefined;
      for (const n of ['kontakt', 'ansvarlig'] as const) if (f[n] !== undefined) k[n] = tekst(f[n], 200) || undefined;
    }
    if (b.notat) {
      const t = tekst(b.notat, 4000);
      if (t) k.notater = [{ id: crypto.randomUUID().slice(0, 8), tekst: t, av, dato: new Date().toISOString() }, ...(k.notater || [])].slice(0, 200);
    }
    if (b.slettNotat) k.notater = (k.notater || []).filter((n) => n.id !== b.slettNotat);
    k.endret = new Date().toISOString();
    k.endretAv = av;
    data[nokkel] = k;
    try {
      if (TESTFIL) { (await import('node:fs')).writeFileSync(TESTFIL, JSON.stringify(data)); return NextResponse.json({ ok: true, kunde: k }); }
      await put(STI, JSON.stringify(data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', ...(etag ? { ifMatch: etag } : {}) });
      return NextResponse.json({ ok: true, kunde: k });
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) continue;
      return NextResponse.json({ feil: (e as Error).message.slice(0, 200) }, { status: 500 });
    }
  }
  return NextResponse.json({ feil: 'Noen andre lagret samtidig. Prøv igjen.' }, { status: 409 });
}
