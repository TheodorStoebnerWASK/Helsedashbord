import data from '@/data/dashboard.json';

// Dataene bygges inn ved deploy (GitHub Actions committer ny data → Vercel bygger på nytt).
// Ruten er beskyttet av middleware, så data er kun tilgjengelig for innloggede.
export const dynamic = 'force-static';

export function GET() {
  return Response.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
