import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, lagToken, passord } from './lib/auth';

export async function middleware(req: NextRequest) {
  const pw = passord();
  if (pw && req.cookies.get(COOKIE)?.value === (await lagToken(pw))) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) return new NextResponse('Ikke innlogget', { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon|wa-mark|wa-logo|fonts).*)'],
};
