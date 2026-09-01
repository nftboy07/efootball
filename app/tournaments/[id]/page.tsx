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
  const [copied, setCopied] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  // Match result submission state
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

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

  function copyRoomCode(code: string) {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      setMsg('success: Registration confirmed! Keep your player token in localStorage.');
      setName('');
      setEf('');
      load();
    } catch (e: any) {
      setMsg('error: ' + (e.message || 'Registration failed'));
    }
  }

  async function submitMatchResult() {
    if (!selectedMatch) return;
    setResultMsg('');
    setUploading(true);

    try {
      const token = localStorage.getItem('player_token');
      if (!token) {
        throw new Error('Please register or provide your player token to submit match scores.');
      }

      let evidenceUrl: string | undefined = undefined;

      // If user uploaded a screenshot, send to Cloudinary /api/upload
      if (evidenceFile) {
        const formData = new FormData();
        formData.append('file', evidenceFile);
        const upRes = await fetch(API + '/api/upload', {
          method: 'POST',
          headers: { 'X-Player-Token': token },
          body: formData,
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.detail || 'Screenshot upload failed');
        evidenceUrl = upData.url;
      }

      await api(`/api/matches/${selectedMatch.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Player-Token': token,
        },
        body: JSON.stringify({
          score_a: parseInt(scoreA, 10),
          score_b: parseInt(scoreB, 10),
          evidence_url: evidenceUrl,
        }),
      });

      setResultMsg('success: Score submitted! Awaiting organizer verification.');
      setSelectedMatch(null);
      setScoreA('');
      setScoreB('');
      setEvidenceFile(null);
      load();
    } catch (e: any) {
      setResultMsg('error: ' + (e.message || 'Score submission failed'));
    } finally {
      setUploading(false);
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
      {/* HEADER */}
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
        {/* HERO */}
        <section className="tournament-hero">
          {/* KONAMI BOKEH ORBS (YELLOW & BLUE COMBO) */}
          <div className="konami-orb orb-blue-lg" style={{ opacity: 0.6 }} />
          <div className="konami-orb orb-yellow-md" style={{ opacity: 0.6 }} />

          <div>
            <span className="section-index">COMMUNITY CUP / {t.id}</span>
            <h1>
              {t.name}
              <br />
              <em>Matchday.</em>
            </h1>
            <p>{playerCount}/8 registered players · Free entry · Single elimination bracket.</p>
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
            <b>{t.efootball_id ? 'KONAMI ROOM LIVE' : 'ROOM PENDING GENERATION'}</b>
          </div>
        </section>

        {/* CONTENT */}
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

          {/* KONAMI CUSTOM ROOM CODE */}
          {t.efootball_id && (
            <section className="code-panel">
              <span className="section-index">KONAMI CUSTOM ROOM CODE</span>
              <strong>{t.efootball_id}</strong>
              <p>
                Open eFootball → Custom Tournament → Join Room and enter this code.{' '}
                <button
                  className="text-link"
                  onClick={() => copyRoomCode(t.efootball_id)}
                  style={{ marginLeft: '10px', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  {copied ? 'COPIED!' : 'COPY CODE ↗'}
                </button>
              </p>
            </section>
          )}

          {/* COLUMNS */}
          <div className="tournament-columns">
            {/* REGISTERED ROSTER */}
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
                <p>Website registrations are locked into the official draw.</p>
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

            {/* JOIN PANEL */}
            <section className="join-panel">
              <span className="section-index">RESERVE A SLOT</span>
              <h2>
                Join the
                <br />
                <em>matchday.</em>
              </h2>
              {playerCount >= maxPlayers ? (
                <div className="status-note">This cup is full! Watch the bracket progress below.</div>
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
                      placeholder="Your gamer tag"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="efootball-name">eFootball in-game username</label>
                    <input
                      id="efootball-name"
                      spellCheck="false"
                      value={ef}
                      onChange={(e) => setEf(e.target.value)}
                      placeholder="Your Konami username"
                      required
                    />
                  </div>
                  <button className="matchday-button primary full" type="submit">
                    Reserve Slot <span>↗</span>
                  </button>
                </form>
              )}
              {msg && (
                <p
                  className={msg.startsWith('success') ? 'success' : 'error'}
                  role="status"
                  style={{ marginTop: '1rem', color: msg.startsWith('success') ? 'var(--ef-volt)' : 'var(--ef-red)' }}
                >
                  {msg}
                </p>
              )}
            </section>
          </div>

          {/* LIVE BRACKET */}
          <section className="matches-section">
            <div className="section-heading compact">
              <div>
                <span className="section-index">LIVE BRACKET</span>
                <h2>
                  Match <em>route.</em>
                </h2>
              </div>
              <p>Click on any ready match to submit verified scores and screenshot proof.</p>
            </div>

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
                  <div>
                    {m.status === 'READY' ? (
                      <button
                        className="matchday-button primary"
                        style={{ minHeight: '36px', padding: '6px 14px', fontSize: '12px' }}
                        onClick={() => setSelectedMatch(m)}
                      >
                        Submit Score
                      </button>
                    ) : (
                      <small>{m.status}</small>
                    )}
                  </div>
                </div>
              ))}
              {!matches?.length && (
                <div className="ranking-empty">The bracket appears after all eight slots are filled.</div>
              )}
            </div>

            {/* RESULT SUBMISSION MODAL / FORM */}
            {selectedMatch && (
              <div
                style={{
                  marginTop: '2rem',
                  padding: '24px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--ef-volt)',
                  borderRadius: '12px',
                }}
              >
                <span className="section-index">REPORT SCORE FOR {selectedMatch.id}</span>
                <h3 style={{ margin: '10px 0 20px', color: '#fff' }}>Submit Match Proof</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="field">
                    <label>Score for Player A</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={scoreA}
                      onChange={(e) => setScoreA(e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="field">
                    <label>Score for Player B</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={scoreB}
                      onChange={(e) => setScoreB(e.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Match Proof Screenshot (Cloudinary upload)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '14px', marginTop: '18px' }}>
                  <button
                    className="matchday-button primary"
                    onClick={submitMatchResult}
                    disabled={uploading || scoreA === '' || scoreB === ''}
                  >
                    {uploading ? 'UPLOADING PROOF…' : 'CONFIRM SCORE ↗'}
                  </button>
                  <button className="matchday-button secondary" onClick={() => setSelectedMatch(null)}>
                    Cancel
                  </button>
                </div>

                {resultMsg && (
                  <p
                    style={{
                      marginTop: '1rem',
                      color: resultMsg.startsWith('success') ? 'var(--ef-volt)' : 'var(--ef-red)',
                    }}
                  >
                    {resultMsg}
                  </p>
                )}
              </div>
            )}
          </section>
        </section>
      </main>

      {/* FOOTER */}
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


