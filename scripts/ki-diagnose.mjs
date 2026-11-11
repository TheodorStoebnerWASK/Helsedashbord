#!/usr/bin/env node
// Diagnose av GitHub Models fra GitHub Actions. Skriver data/ki-diagnose.json, som committes sammen med dataene.
import { writeFile } from 'node:fs/promises';
const token = process.env.GITHUB_TOKEN;
const ut = { tid: new Date().toISOString(), harToken: !!token, tokenPrefiks: token ? token.slice(0, 4) : null, tester: [] };
const tester = [
  { navn: 'katalog', url: 'https://models.github.ai/catalog/models', metode: 'GET' },
  { navn: 'github.ai gpt-4.1-mini', url: 'https://models.github.ai/inference/chat/completions', modell: 'openai/gpt-4.1-mini' },
  { navn: 'github.ai gpt-4o-mini', url: 'https://models.github.ai/inference/chat/completions', modell: 'openai/gpt-4o-mini' },
  { navn: 'azure gpt-4o-mini', url: 'https://models.inference.ai.azure.com/chat/completions', modell: 'gpt-4o-mini' },
];
for (const t of tester) {
  try {
    const res = await fetch(t.url, {
      method: t.metode || 'POST',
      redirect: 'manual',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: t.metode === 'GET' ? undefined : JSON.stringify({ model: t.modell, messages: [{ role: 'user', content: 'Svar bare med ordet hei.' }], max_tokens: 5 }),
    });
    const tekst = await res.text();
    ut.tester.push({ navn: t.navn, status: res.status, location: res.headers.get('location'), contentType: res.headers.get('content-type'),
      headere: Object.fromEntries([...res.headers].filter(([k]) => /x-ratelimit|x-ms|x-request|x-github|server|www-authenticate/i.test(k))), kropp: tekst.slice(0, 400) });
  } catch (e) {
    ut.tester.push({ navn: t.navn, feil: String(e) });
  }
}
await writeFile(new URL('../data/ki-diagnose.json', import.meta.url), JSON.stringify(ut, null, 2));
console.log(JSON.stringify(ut, null, 2));
