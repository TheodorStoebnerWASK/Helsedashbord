// Enkel passordbeskyttelse som fungerer på alle Vercel-planer.
// Passordet settes KUN som miljøvariabelen DASHBOARD_PASSWORD (i Vercel, eller i .env.local lokalt).
// Det står bevisst ikke i koden, siden repoet kan være offentlig. Mangler variabelen, slipper ingen inn.
export const COOKIE = 'wa_helse_tilgang';

export const passord = () => process.env.DASHBOARD_PASSWORD || '';

export async function lagToken(pw: string): Promise<string> {
  const salt = process.env.AUTH_SECRET || 'wa-helsedashbord';
  const data = new TextEncoder().encode(`${salt}:${pw}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
