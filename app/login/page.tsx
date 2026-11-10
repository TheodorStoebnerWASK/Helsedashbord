'use client';
import { useState } from 'react';

export default function Login() {
  const [pw, setPw] = useState('');
  const [feil, setFeil] = useState('');
  const [jobber, setJobber] = useState(false);
  return (
    <main className="login">
      <div className="login-boks">
        <img className="login-logo" src="/wa-logo-hvit.svg" alt="Wergeland/Apenes" width={320} height={21} />
        <p className="eyebrow">Internt verktøy</p>
        <h1>Helsepolitisk radar</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setJobber(true);
            setFeil('');
            const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pw }) });
            if (r.ok) location.href = '/';
            else { setFeil(r.status === 503 ? 'Passordet er ikke satt opp ennå (miljøvariabelen DASHBOARD_PASSWORD).' : 'Feil passord.'); setJobber(false); }
          }}
        >
          <label className="felt">
            <span>Passord</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" />
          </label>
          {feil && <p className="feil">{feil}</p>}
          <button className="knapp knapp-hvit" disabled={jobber || !pw}>{jobber ? 'Logger inn …' : 'Logg inn'}</button>
        </form>
      </div>
      
    </main>
  );
}
