import data from '@/data/innspill.json';

// Store data lastes bare når fanen åpnes. Beskyttet av middleware som resten.
export const dynamic = 'force-static';

export function GET() {
  return Response.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
