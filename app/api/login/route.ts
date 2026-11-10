import { NextResponse } from 'next/server';
import { COOKIE, lagToken, passord } from '@/lib/auth';

export async function POST(req: Request) {
  if (!passord()) return NextResponse.json({ ok: false, mangler: true }, { status: 503 });
  const { pw } = await req.json().catch(() => ({ pw: '' }));
  if (typeof pw !== 'string' || pw !== passord()) {
    await new Promise((r) => setTimeout(r, 600)); // bremser gjetting
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await lagToken(pw), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
