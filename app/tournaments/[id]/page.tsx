'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSound } from '../../components/SoundEffects';

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
  const { playWhistle, playGoalCheer, playClick } = useSound();
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
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [playerTokenInput, setPlayerTokenInput] = useState('');
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
    try {
      const saved = localStorage.getItem('player_token');
      if (saved) setPlayerTokenInput(saved);
    } catch {}
  }, [load]);

  function copyRoomCode(code: string) {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    playClick();
    setTimeout(() => setCopied(false), 2000);
  }

  async function join() {
    setMsg('');
    playClick();
    try {
      const d = await api('/api/tournaments/' + id + '/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name, efootball_username: ef }),
      });
      if (d?.player?.token) {
        localStorage.setItem('player_token', d.player.token);
      }
      playGoalCheer();
      setMsg('success: Registration confirmed! Your slot is locked.');
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
    playClick();

    try {
      const token = localStorage.getItem('player_token') || playerTokenInput.trim();
      if (!token) {
        throw new Error('Please register or paste your player token to submit match scores.');
      }

      let evidenceLink: string | undefined = evidenceUrl.trim() || undefined;
      if (evidenceLink && !/^https?:\/\//i.test(evidenceLink)) {
        throw new Error('Evidence URL must start with http:// or https://');
      }

      if (evidenceFile) {
        const formData = new FormData();
        formData.append('file', evidenceFile);
        const upRes = await fetch('/api/evidence-upload', {
          method: 'POST',
          headers: { 'X-Player-Token': token },
          body: formData,
        });
        const upData = await upRes.json().catch(() => ({}));
        if (!upRes.ok) throw new Error(upData.detail || upData.error || 'Screenshot upload failed');
        evidenceLink = upData.url;
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
          evidence_url: evidenceLink,
        }),
      });

      playWhistle();
      setResultMsg('success: Score submitted! Awaiting organizer verification.');
      setSelectedMatch(null);
      setScoreA('');
      setScoreB('');
      setEvidenceFile(null);
      setEvidenceUrl('');
      load();
    } catch (e: any) {
      setResultMsg('error: ' + (e.message || 'Score submission failed'));
    } finally {
      setUploading(false);
    }
  }

  const playerCount = t?.players?.length || 0;
  const maxPlayers = t?.max_players || 8;
  const progressPct = Math.min(100, (playerCount / maxPlayers) * 100);

  return (
    <div className="matchday-shell">
      {/* 1. TOP BLACK KONAMI HEADER */}
      <header className="konami-top-header">
        <div className="konami-top-inner">
          <a className="konami-red-logo" href="https://www.konami.com/games/" target="_blank" rel="noreferrer">
            KONAMI
          </a>
          <div className="konami-lang-select">
            <span>English(US)</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </div>
        </div>
      </header>

      {/* 2. OFFICIAL BLUE HEADER STAGE */}
      <div className="konami-main-header">
        <a className="konami-header-logo" href="/">
          <div className="konami-header-emblem">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 14c17.1 0 31 13.9 31 31H19c0-17.1 13.9-31 31-31zm0 62c-17.1 0-31-13.9-31-31h62c0 17.1-13.9 31-31 31z"/>
            </svg>
          </div>
          <span className="konami-header-title">
            FOOTBALL<span>™</span>
          </span>
        </a>

        {/* 3. CAPSULE / PILL NAVIGATION */}
        <nav className="konami-nav-pills" aria-label="Official Navigation">
          <a className="pill-btn" href="/">
            HOME
          </a>
          <a className="pill-btn home" href="/#tournaments">
            Matchday Arena
          </a>
          <a className="pill-btn" href="/#modes">
            Game Modes
          </a>
          <a className="pill-btn" href="/#how">
            Route
          </a>
          <a className="pill-btn" href="/#leaderboard">
            Standings
          </a>
          <a className="pill-btn download" href="/#tournaments">
            ENTER CUP
          </a>
        </nav>
      </div>

      <main className="main-content-flow">
        {loading && !t ? (
          <section className="section-container">
            <div className="status-note">
              <span className="section-index">LIVE MATCHDAY</span>
              <h2 style={{ color: '#fff', margin: '10px 0' }}>Loading matchday arena…</h2>
              <p>Connecting to tournament servers and syncing bracket details.</p>
            </div>
          </section>
        ) : !t ? (
          <section className="section-container">
            <div className="status-note">
              <span className="section-index">MATCHDAY ERROR</span>
              <h2 style={{ color: '#fff', margin: '10px 0' }}>{msg || 'Tournament Not Found'}</h2>
              <p>This matchday cup is unavailable or may have concluded.</p>
              <div style={{ display: 'flex', gap: '14px', marginTop: '20px' }}>
                <a className="matchday-button primary" href="/#tournaments">
                  View Live Cups <span>↗</span>
                </a>
                <button className="matchday-button secondary" onClick={load}>
                  Try Again
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* HERO SECTION */}
            <section className="tournament-hero">
              <div>
                <span className="section-index">COMMUNITY CUP / {t.id}</span>
                <h1>
                  {t.name} <br />
                  <em>Matchday Arena.</em>
                </h1>
                <p>{playerCount}/8 registered players · Free entry · Single elimination bracket.{t.prize_pool ? ` · ${t.prize_pool}` : ''}</p>
              </div>

              <div className="tournament-score">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>PLAYER SLOTS</span>
                  <span className="cup-status">
                    <i /> {t.status}
                  </span>
                </div>
                <strong>
                  {String(playerCount).padStart(2, '0')}
                  <small>/08</small>
                </strong>
                <div className="progress-track">
                  <i style={{ width: `${progressPct}%` }} />
                </div>
                <b>{t.efootball_id ? 'KONAMI CUSTOM ROOM READY' : 'ROOM CODE GENERATION PENDING'}</b>
              </div>
            </section>

            {/* CONTENT */}
            <section className="tournament-content">
              {/* STAGES TRACK */}
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
                  <span className="section-index">KONAMI IN-GAME CUSTOM ROOM CODE</span>
                  <strong>{t.efootball_id}</strong>
                  <p>
                    Open eFootball™ → Custom Tournament → Join Room and enter this code.
                    <button className="code-copy-btn" onClick={() => copyRoomCode(t.efootball_id)}>
                      {copied ? 'COPIED! ✓' : 'COPY CODE ↗'}
                    </button>
                  </p>
                </section>
              )}

              {/* COLUMNS */}
              <div className="tournament-columns">
                {/* REGISTERED ROSTER */}
                <div>
                  <div className="section-title-wrap" style={{ marginBottom: '14px' }}>
                    <div>
                      <span className="section-index">REGISTERED ROSTER</span>
                      <h2 className="section-heading" style={{ fontSize: '38px' }}>
                        Players <br />
                        <em>in the cup.</em>
                      </h2>
                    </div>
                  </div>
                  <p className="section-desc" style={{ marginBottom: '16px' }}>
                    Website registrations are locked into the official bracket draw.
                  </p>

                  <div className="roster">
                    {t.players?.map((p: any, i: number) => (
                      <Link
                        href={`/players/${encodeURIComponent(p.efootball_username || p.id)}`}
                        className="roster-row"
                        key={p.id || i}
                        style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}
                      >
                        <b>#{String(i + 1).padStart(2, '0')}</b>
                        <strong>{p.display_name} ↗</strong>
                        <span>{p.efootball_username}</span>
                      </Link>
                    ))}
                    {!playerCount && <div className="ranking-empty">The first player opens the roster.</div>}
                  </div>
                </div>

                {/* JOIN PANEL */}
                <div className="join-panel">
                  <span className="section-index">RESERVE A SLOT</span>
                  <h2>
                    Join the <br />
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
                        <label htmlFor="display-name">Gamer Tag / Display Name</label>
                        <input
                          id="display-name"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. striker99"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="efootball-name">eFootball In-Game Username</label>
                        <input
                          id="efootball-name"
                          spellCheck="false"
                          value={ef}
                          onChange={(e) => setEf(e.target.value)}
                          placeholder="e.g. Konami_User#123"
                          required
                        />
                      </div>
                      <button className="matchday-button primary full" type="submit" style={{ marginTop: '10px' }}>
                        Reserve Slot <span>↗</span>
                      </button>
                    </form>
                  )}

                  {msg && (
                    <p
                      style={{
                        marginTop: '1rem',
                        fontWeight: 700,
                        color: msg.startsWith('success') ? 'var(--konami-yellow)' : '#ff4444',
                      }}
                      role="status"
                    >
                      {msg}
                    </p>
                  )}
                </div>
              </div>

              {/* LIVE BRACKET FIXTURES */}
              <section className="matches-section">
                <div className="section-title-wrap">
                  <div>
                    <span className="section-index">LIVE BRACKET</span>
                    <h2 className="section-heading">
                      Match <em>Fixtures.</em>
                    </h2>
                  </div>
                  <p className="section-desc">Click on any ready match to submit verified scores and screenshot proof.</p>
                </div>

                <div className="match-list">
                  {matches?.map((m: any) => (
                    <div className="match-row" key={m.id}>
                      <span>
                        {m.round} / {m.slot}
                      </span>
                      <strong>{m.player_a_name || m.player_a || 'TBD'}</strong>
                      <b>{m.score_a ?? '—'}</b>
                      <strong>{m.player_b_name || m.player_b || 'TBD'}</strong>
                      <b>{m.score_b ?? '—'}</b>
                      <div>
                        {m.status === 'READY' ? (
                          <button
                            className="matchday-button primary"
                            style={{ minHeight: '36px', padding: '6px 14px', fontSize: '13px' }}
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
                    <div className="ranking-empty">The bracket generates automatically when 8 players have registered.</div>
                  )}
                </div>

                {/* RESULT SUBMISSION MODAL */}
                {selectedMatch && (
                  <div className="score-modal">
                    <span className="section-index">REPORT SCORE FOR FIXTURE {selectedMatch.id}</span>
                    <h3 style={{ margin: '10px 0 20px', color: '#fff', fontSize: '24px', textTransform: 'uppercase' }}>
                      Submit Match Verification
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div className="field">
                        <label>Score for {selectedMatch.player_a_name || selectedMatch.player_a || 'Player A'}</label>
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
                        <label>Score for {selectedMatch.player_b_name || selectedMatch.player_b || 'Player B'}</label>
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
                      <label>Match proof screenshot (uploaded to Cloudinary / Supabase — only the URL is stored)</label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="field">
                      <label>Or paste an HTTPS evidence URL</label>
                      <input
                        type="url"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="field">
                      <label>Player token (auto-filled after you register on this device)</label>
                      <input
                        type="password"
                        value={playerTokenInput}
                        onChange={(e) => setPlayerTokenInput(e.target.value)}
                        placeholder="Paste token if submitting from another device"
                        autoComplete="off"
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
                          fontWeight: 700,
                          color: resultMsg.startsWith('success') ? 'var(--konami-yellow)' : '#ff4444',
                        }}
                      >
                        {resultMsg}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </section>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="matchday-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="konami-red-logo">KONAMI</span>
            <span className="footer-tagline">
              eFootball <b>2026</b> Matchday Arena
            </span>
          </div>
          <div className="social-links">
            <a href="/#tournaments">All Tournaments ↗</a>
            <a href="https://www.instagram.com/efbt__2026/" target="_blank" rel="noreferrer">
              Instagram ↗
            </a>
          </div>
        </div>
        <div className="footer-disclaimer">
          <p>
            &quot;eFootball&quot;, &quot;e-Football&quot;, &quot;PES&quot;, and &quot;KONAMI&quot; are registered trademarks of Konami Digital Entertainment Co., Ltd.
          </p>
        </div>
      </footer>
    </div>
  );
}



