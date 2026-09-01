'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://efootball-tournament-kwq4.onrender.com';

async function api(path: string, init?: RequestInit) {
  const r = await fetch(API + path, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || 'Request failed');
  return d;
}

const stages = [
  { round: 'QF', name: 'Quarterfinals', note: '8 → 4' },
  { round: 'SF', name: 'Semifinals', note: '4 → 2' },
  { round: 'F', name: 'Grand final', note: '2 → 1' },
];

export default function Tournament() {
  const params = useParams();
  const id = params?.id as string;
  const [t, setT] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [ef, setEf] = useState('');
  const [msg, setMsg] = useState('');
  const [matches, setMatches] = useState<any[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setMsg('');

    api('/api/tournaments/' + id)
      .then((data) => {
        setT(data);
        setLoading(false);
      })
      .catch((e) => {
        setMsg(e.message || 'Tournament unavailable');
        setLoading(false);
      });

    api('/api/tournaments/' + id + '/matches')
      .then((data) => setMatches(data || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function join() {
    setMsg('');
    try {
      const d = await api('/api/tournaments/' + id + '/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name, efootball_username: ef }),
      });
      if (d?.player?.token) {
        localStorage.setItem('player_token', d.player.token);
      }
      setMsg('success: Registration confirmed. Keep your player token private.');
      setName('');
      setEf('');
      load();
    } catch (e: any) {
      setMsg('error: ' + (e.message || 'Registration failed'));
    }
  }

  if (loading && !t) {
    return (
      <div className="matchday-shell">
        <header className="matchday-nav">
          <a className="brand-lockup" href="/">
            <span className="brand-mark">eF</span>
            <span>
              eFootball <b>2026</b>
            </span>
          </a>
        </header>
        <main className="section missing-tournament">
          <div className="status-note">
            <span className="section-index">LIVE MATCHDAY</span>
            <h2>Loading tournament…</h2>
            <p>Connecting to match servers and syncing bracket details.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!t) {
    return (
      <div className="matchday-shell">
        <header className="matchday-nav">
          <a className="brand-lockup" href="/">
            <span className="brand-mark">eF</span>
            <span>
              eFootball <b>2026</b>
            </span>
          </a>
        </header>
        <main className="section missing-tournament">
          <div className="status-note">
            <span className="section-index">MATCHDAY ERROR</span>
            <h2>{msg || 'Tournament Not Found'}</h2>
            <p>This tournament link is unavailable or may have been updated by the organizer.</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <a className="matchday-button primary" href="/#tournaments">
                View live cups <span>↗</span>
              </a>
              <button className="matchday-button secondary" onClick={load}>
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const playerCount = t.players?.length || 0;
  const maxPlayers = t.max_players || 8;
  const progressPct = Math.min(100, (playerCount / maxPlayers) * 100);

  return (
    <div className="matchday-shell">
      <header className="matchday-nav">
        <a className="brand-lockup" href="/">
          <span className="brand-mark">eF</span>
          <span>
            eFootball <b>2026</b>
          </span>
        </a>
        <span className="cup-status">
          <i />
          {t.status}
        </span>
      </header>

      <main>
        <section className="tournament-hero">
          <div>
            <span className="section-index">COMMUNITY CUP / {t.id}</span>
            <h1>
              {t.name}
              <br />
              <em>Matchday.</em>
            </h1>
            <p>{playerCount}/8 registered players · Free entry · Follow the route to the final.</p>
          </div>
          <div className="tournament-score">
            <span>PLAYER SLOTS</span>
            <strong>
              {String(playerCount).padStart(2, '0')}
              <small>/08</small>
            </strong>
            <div className="progress-track">
              <i style={{ width: `${progressPct}%` }} />
            </div>
            <b>{t.efootball_id ? 'ROOM ACTIVE' : 'ROOM PENDING'}</b>
          </div>
        </section>

        <section className="section tournament-content">
          <div className="route-track tournament-route">
            {stages.map((stage, index) => (
              <div key={stage.round}>
                <b>{stage.round}</b>
                <strong>{stage.name}</strong>
                <span>{stage.note} players</span>
                {index < stages.length - 1 && <i />}
              </div>
            ))}
          </div>

          {t.efootball_id && (
            <section className="code-panel">
              <span className="section-index">KONAMI CUSTOM ROOM</span>
              <strong>{t.efootball_id}</strong>
              <p>Open eFootball → Custom Tournament → Join Tournament and enter this code.</p>
            </section>
          )}

          <div className="tournament-columns">
            <section>
              <div className="section-heading compact">
                <div>
                  <span className="section-index">REGISTERED ROSTER</span>
                  <h2>
                    Players
                    <br />
                    <em>in the cup.</em>
                  </h2>
                </div>
                <p>Website registrations are counted here. The KONAMI lobby itself must be checked in-game.</p>
              </div>
              <div className="roster">
                {t.players?.map((p: any, i: number) => (
                  <div className="roster-row" key={p.id || i}>
                    <b>0{i + 1}</b>
                    <strong>{p.display_name}</strong>
                    <span>{p.efootball_username}</span>
                  </div>
                ))}
                {!playerCount && <div className="ranking-empty">The first player opens the roster.</div>}
              </div>
            </section>

            <section className="join-panel">
              <span className="section-index">RESERVE A SLOT</span>
              <h2>
                Join the
                <br />
                <em>matchday.</em>
              </h2>
              {playerCount >= maxPlayers ? (
                <div className="status-note">This cup is full. Watch the main page for the next opening.</div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    join();
                  }}
                >
                  <div className="field">
                    <label htmlFor="display-name">Display name</label>
                    <input
                      id="display-name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="efootball-name">eFootball username</label>
                    <input
                      id="efootball-name"
                      spellCheck="false"
                      value={ef}
                      onChange={(e) => setEf(e.target.value)}
                      placeholder="Your eFootball name"
                      required
                    />
                  </div>
                  <button className="matchday-button primary full" type="submit">
                    Reserve slot <span>↗</span>
                  </button>
                </form>
              )}
              {msg && (
                <p className={msg.startsWith('success') ? 'success' : 'error'} role="status" style={{ marginTop: '1rem' }}>
                  {msg}
                </p>
              )}
            </section>
          </div>

          <section className="matches-section">
            <span className="section-index">LIVE BRACKET</span>
            <h2>
              Match <em>route.</em>
            </h2>
            <div className="match-list">
              {matches?.map((m: any) => (
                <div className="match-row" key={m.id}>
                  <span>
                    {m.round} / {m.slot}
                  </span>
                  <strong>{m.player_a || 'TBD'}</strong>
                  <b>{m.score_a ?? '—'}</b>
                  <strong>{m.player_b || 'TBD'}</strong>
                  <b>{m.score_b ?? '—'}</b>
                  <small>{m.status}</small>
                </div>
              ))}
              {!matches?.length && (
                <div className="ranking-empty">The bracket appears after all eight slots are filled.</div>
              )}
            </div>
          </section>
        </section>
      </main>

      <footer className="matchday-footer">
        <span>
          eFootball <b>2026</b>
        </span>
        <span>Independent community platform · Not affiliated with KONAMI.</span>
        <a href="/#tournaments">Back to cups ↗</a>
        <span className="social-links">
          <a
            href="https://www.instagram.com/efbt__2026/"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow eFootball 2026 on Instagram"
          >
            Instagram ↗
          </a>
          <a
            href="https://www.facebook.com/search/pages/?q=efbt__2026"
            target="_blank"
            rel="noreferrer"
            aria-label="Find eFootball 2026 on Facebook"
          >
            Facebook ↗
          </a>
        </span>
      </footer>
    </div>
  );
}

