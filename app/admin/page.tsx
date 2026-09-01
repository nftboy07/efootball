'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://efootball-tournament-kwq4.onrender.com';

type Tournament = {
  id: string;
  name: string;
  status: string;
  players: any[];
  max_players: number;
  efootball_id?: string | null;
  bracket_generated?: boolean;
};

async function api(path: string, init?: RequestInit) {
  const r = await fetch(API + path, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || 'Request failed');
  return d;
}

export default function Admin() {
  const [key, setKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [prompt, setPrompt] = useState(
    'High-energy vertical video for eFootball 2026 Community Cup 1. Mobile gameplay, intense stadium spotlights, electric yellow and blue graphics, text reading Free Entry and 8-player knockout, join at efootball2026.online'
  );
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [provider, setProvider] = useState('wan-video-turbo');
  const [copyProvider, setCopyProvider] = useState('qwen');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [copy, setCopy] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState<{
    active: boolean;
    taskId?: string;
    elapsed: number;
    estimated: number;
    pct: number;
    phase: string;
  }>({
    active: false,
    elapsed: 0,
    estimated: 60,
    pct: 0,
    phase: '',
  });

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState('');
  const [msg, setMsg] = useState('');

  const selectedTournament = tournaments.find((t) => t.id === selected);
  const headers = () => ({ 'Content-Type': 'application/json', 'X-Admin-Key': key });

  async function load() {
    try {
      const data = await api('/api/tournaments');
      if (Array.isArray(data)) {
        setTournaments(data);
        if (data.length && !selected) {
          setSelected(data[0].id);
        }
      }
      setMsg('');
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function unlock() {
    setMsg('');
    try {
      await api('/api/admin/submissions', { headers: { 'X-Admin-Key': key } });
      setUnlocked(true);
      load();
    } catch (e: any) {
      setMsg('Invalid admin password. Please try again.');
    }
  }

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked]);

  async function create() {
    try {
      const t = await api('/api/admin/tournaments', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name }),
      });
      setName('');
      setSelected(t.id);
      setMsg('success: Tournament created! Share its page link with players.');
      load();
    } catch (e: any) {
      setMsg('error: ' + e.message);
    }
  }

  async function action(path: string, body?: object) {
    try {
      await api(path, {
        method: 'POST',
        headers: headers(),
        body: body ? JSON.stringify(body) : undefined,
      });
      setMsg('success: Updated successfully.');
      load();
    } catch (e: any) {
      setMsg('error: ' + e.message);
    }
  }

  async function generateMedia() {
    setGenerating(true);
    setVideoUrl('');
    setImageUrl('');
    setMsg('');

    const isVideo = provider.startsWith('wan-video');
    const model = provider === 'wan-video-plus' ? 'wan2.1-t2v-plus' : 'wan2.1-t2v-turbo';
    const estimated = model === 'wan2.1-t2v-plus' ? 90 : 60;

    let timerInterval: any = null;

    if (isVideo) {
      let seconds = 0;
      setVideoProgress({
        active: true,
        elapsed: 0,
        estimated,
        pct: 5,
        phase: '🚀 Initializing Alibaba Wan 2.1 GPU cluster…',
      });

      timerInterval = setInterval(() => {
        seconds += 1;
        const currentPct = Math.min(97, Math.floor((seconds / estimated) * 100));
        let currentPhase = '🚀 Allocating GPU node & analyzing prompt…';

        if (seconds >= 10 && seconds < 30) {
          currentPhase = '🎬 Synthesizing 3D camera pan & stadium spotlight effects…';
        } else if (seconds >= 30 && seconds < 50) {
          currentPhase = '⚽ Rendering high-fps football gameplay & motion blur…';
        } else if (seconds >= 50) {
          currentPhase = '📦 Finalizing video stream & encoding MP4…';
        }

        setVideoProgress((prev) => ({
          ...prev,
          elapsed: seconds,
          pct: Math.max(prev.pct, currentPct),
          phase: currentPhase,
        }));
      }, 1000);
    }

    try {
      if (isVideo) {
        // 1. Submit task immediately
        const submitRes = await fetch('/api/generate-reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aspectRatio, model }),
        });

        const submitData = await submitRes.json();
        if (!submitRes.ok || !submitData.taskId) {
          throw new Error(submitData.error || 'Failed to submit video generation task');
        }

        const taskId = submitData.taskId;
        setVideoProgress((prev) => ({ ...prev, taskId }));

        // 2. Poll every 3 seconds until completed
        let finalUrl = '';
        const maxPollTime = Date.now() + 180000;

        while (Date.now() < maxPollTime) {
          await new Promise((res) => setTimeout(res, 3500));
          const pollRes = await fetch(`/api/generate-reel?taskId=${taskId}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'SUCCEEDED' && pollData.videoUrl) {
            finalUrl = pollData.videoUrl;
            break;
          } else if (pollData.status === 'FAILED') {
            throw new Error(pollData.error || 'Alibaba Wan 2.1 video generation failed');
          }
        }

        if (timerInterval) clearInterval(timerInterval);

        if (!finalUrl) {
          throw new Error('Video generation timed out. Please try again.');
        }

        setVideoProgress((prev) => ({
          ...prev,
          pct: 100,
          phase: '✅ AI Video Synthesis Complete!',
        }));

        setVideoUrl(finalUrl);
        setMsg('success: Alibaba Wan 2.1 AI Video generated successfully!');
      } else {
        // Image generation
        const r = await fetch('/api/generate-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider, aspectRatio }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Generation failed');
        setImageUrl(d.media?.url || d.url || '');
        setMsg('success: AI Image generated successfully!');
      }
    } catch (e: any) {
      if (timerInterval) clearInterval(timerInterval);
      setVideoProgress({ active: false, elapsed: 0, estimated: 60, pct: 0, phase: '' });
      setMsg('error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function generateCopy() {
    setGenerating(true);
    setCopy('');
    setMsg('Generating social media caption…');
    try {
      const r = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: copyProvider, prompt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Caption generation failed');
      setCopy(d.text || '');
      setMsg('success: Caption generated successfully!');
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="admin-shell">
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
        <nav className="konami-nav-pills" aria-label="Organizer Navigation">
          <a className="pill-btn" href="/">
            HOME
          </a>
          <a className="pill-btn" href="/#tournaments">
            Matchday Cups
          </a>
          <a className="pill-btn" href="/#modes">
            Game Modes
          </a>
          <a className="pill-btn" href="/#leaderboard">
            Standings
          </a>
          <a className="pill-btn home" href="/admin">
            ORGANIZER HUB 🔒
          </a>
        </nav>
      </div>

      <main className="main-content-flow">
        <div className="admin-main">
          {!unlocked ? (
            /* LOCKED LOGIN CARD */
            <section className="admin-card admin-login-box">
              <span className="section-index">ORGANIZER CONTROL ROOM</span>
              <h1 className="admin-header-title" style={{ fontSize: '48px', margin: '10px 0 16px' }}>
                Admin <em>Access.</em>
              </h1>
              <p className="section-desc" style={{ marginBottom: '24px' }}>
                Enter your private admin password to create tournaments, verify scores, and generate AI video reels.
              </p>

              <div className="field">
                <label>ADMIN PASSWORD</label>
                <input
                  autoFocus
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') unlock();
                  }}
                  placeholder="Enter administrator password"
                />
              </div>

              <button
                className="matchday-button primary full"
                onClick={unlock}
                disabled={!key}
                style={{ marginTop: '12px' }}
              >
                Unlock Organizer Hub ↗
              </button>

              {msg && (
                <p
                  style={{
                    marginTop: '16px',
                    color: '#ff4444',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                  }}
                >
                  {msg}
                </p>
              )}
            </section>
          ) : (
            /* UNLOCKED ORGANIZER INTERFACE */
            <>
              <div className="section-title-wrap" style={{ marginBottom: '30px' }}>
                <div>
                  <span className="section-index">TOURNAMENT CONTROL CENTER</span>
                  <h1 className="admin-header-title">
                    Run your <em>Community Cups.</em>
                  </h1>
                </div>
                <p className="section-desc">
                  Manage player rosters, connect official Konami Custom Room codes, and generate broadcast promo reels.
                </p>
              </div>

              {/* 1. CONTENT STUDIO: WAN 2.1 VIDEO GENERATOR */}
              <section className="admin-card">
                <div className="section-title-wrap" style={{ marginBottom: '20px' }}>
                  <div>
                    <span className="section-index">AI CONTENT STUDIO</span>
                    <h2 className="section-heading" style={{ fontSize: '36px' }}>
                      Alibaba Wan 2.1 <em>Video Generator.</em>
                    </h2>
                  </div>
                  <p className="section-desc">
                    Synthesize cinema-grade reels and tournament promotional assets via Alibaba Cloud Model Studio.
                  </p>
                </div>

                <div className="admin-grid-2">
                  <div>
                    <div className="field">
                      <label>AI VIDEO & IMAGE MODEL</label>
                      <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                        <option value="wan-video-turbo">Wan 2.1 Video Turbo · Alibaba Cloud Model Studio</option>
                        <option value="wan-video-plus">Wan 2.1 Video Plus · Alibaba Cloud Model Studio</option>
                        <option value="pollinations-image">Pollinations · FLUX Image · Free</option>
                        <option value="hf-image">Hugging Face · FLUX Image · HF_TOKEN</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>PROMPT</label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your video scene…"
                      />
                    </div>

                    <div className="field">
                      <label>ASPECT RATIO / FORMAT</label>
                      <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                        <option value="9:16">9:16 Vertical (Instagram Reels / TikTok / Shorts)</option>
                        <option value="16:9">16:9 Landscape (YouTube / Twitch Broadcast)</option>
                        <option value="1:1">1:1 Square (Instagram & Facebook Feed)</option>
                      </select>
                    </div>

                    <button
                      className="matchday-button primary full"
                      onClick={generateMedia}
                      disabled={generating || prompt.trim().length < 5}
                      style={{ marginTop: '8px' }}
                    >
                      {generating ? 'SYNTHESIZING MEDIA…' : 'GENERATE AI VIDEO / MEDIA ↗'}
                    </button>
                  </div>

                  <div>
                    <div className="field">
                      <label>AI CAPTION GENERATOR</label>
                      <select value={copyProvider} onChange={(e) => setCopyProvider(e.target.value)}>
                        <option value="qwen">Alibaba Qwen Plus · Model Studio</option>
                        <option value="openrouter">OpenRouter · Llama 3.3 70B</option>
                        <option value="groq">Groq · Llama 3.3</option>
                        <option value="nvidia">NVIDIA · Llama 3.1</option>
                      </select>
                    </div>

                    <button
                      className="matchday-button secondary full"
                      onClick={generateCopy}
                      disabled={generating}
                      style={{ marginBottom: '14px' }}
                    >
                      Generate Instagram Caption ↗
                    </button>

                    {copy && (
                      <div className="caption-result-box">
                        <strong>Generated Instagram Copy:</strong>
                        <p style={{ margin: '8px 0 0' }}>{copy}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* REAL-TIME VIDEO SYNTHESIS PROGRESS & COUNTDOWN */}
                {videoProgress.active && (
                  <div className="video-progress-card">
                    <div className="video-progress-header">
                      <div className="video-progress-title">
                        <span className="video-live-dot" />
                        <span>AI Video Synthesis in Progress</span>
                      </div>
                      <span className="video-countdown-badge">
                        ⏱️ {String(Math.floor(videoProgress.elapsed / 60)).padStart(2, '0')}:
                        {String(videoProgress.elapsed % 60).padStart(2, '0')} / ~
                        {String(Math.floor(videoProgress.estimated / 60)).padStart(2, '0')}:
                        {String(videoProgress.estimated % 60).padStart(2, '0')} (
                        {Math.max(0, videoProgress.estimated - videoProgress.elapsed)}s remaining)
                      </span>
                    </div>

                    <div className="video-bar-track">
                      <div className="video-bar-fill" style={{ width: `${videoProgress.pct}%` }} />
                    </div>

                    <div className="video-status-meta">
                      <span className="video-phase-text">{videoProgress.phase}</span>
                      <strong style={{ color: 'var(--konami-yellow)', fontFamily: 'var(--font-mono)' }}>
                        {videoProgress.pct}%
                      </strong>
                    </div>
                  </div>
                )}

                {videoUrl && (
                  <div className="studio-video-box">
                    <video controls src={videoUrl} autoPlay loop />
                    <div style={{ padding: '16px', background: '#081766' }}>
                      <a className="matchday-button primary full" href={videoUrl} target="_blank" rel="noreferrer">
                        OPEN / DOWNLOAD MP4 VIDEO ↗
                      </a>
                    </div>
                  </div>
                )}

                {imageUrl && (
                  <div className="studio-img-box">
                    <img src={imageUrl} alt="Generated promotion" />
                    <div style={{ padding: '16px', background: '#081766' }}>
                      <a className="matchday-button primary full" href={imageUrl} target="_blank" rel="noreferrer">
                        OPEN / DOWNLOAD IMAGE ↗
                      </a>
                    </div>
                  </div>
                )}
              </section>

              {/* 2. TOURNAMENTS OPERATIONS: CREATE & SELECT */}
              <div className="admin-grid-2">
                {/* CREATE CARD */}
                <section className="admin-card">
                  <span className="section-index">OPERATION 01</span>
                  <h2 className="section-heading" style={{ fontSize: '32px', margin: '8px 0 16px' }}>
                    Create <em>Tournament.</em>
                  </h2>

                  <div className="field">
                    <label>TOURNAMENT NAME</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. eFootball 2026 Community Cup #2"
                    />
                  </div>

                  <button
                    className="matchday-button primary full"
                    onClick={create}
                    disabled={name.trim().length < 2}
                    style={{ marginTop: '10px' }}
                  >
                    Create New Tournament ↗
                  </button>
                </section>

                {/* LIVE COUNT CARD */}
                <section className="admin-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="section-index">OPERATION 02</span>
                    <button className="code-copy-btn" onClick={load}>
                      ↻ Refresh
                    </button>
                  </div>
                  <h2 className="section-heading" style={{ fontSize: '32px', margin: '0 0 16px' }}>
                    Active <em>Cups.</em>
                  </h2>

                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {tournaments.map((t) => (
                      <button
                        className={'admin-tournament-btn ' + (selected === t.id ? 'active' : '')}
                        key={t.id}
                        onClick={() => setSelected(t.id)}
                      >
                        <div>
                          <strong>{t.name}</strong>
                          <small>
                            {t.id} · Status: {t.status}
                          </small>
                        </div>
                        <b>
                          {t.players.length}/{t.max_players || 8}
                        </b>
                      </button>
                    ))}
                    {!tournaments.length && <p className="section-desc">No tournaments found. Create your first cup.</p>}
                  </div>
                </section>
              </div>

              {/* 3. SELECTED TOURNAMENT CONTROL PANEL */}
              {selectedTournament && (
                <section className="admin-card" style={{ border: '2px solid var(--konami-yellow)' }}>
                  <div className="section-title-wrap" style={{ marginBottom: '20px' }}>
                    <div>
                      <span className="section-index">SELECTED ARENA / {selectedTournament.id}</span>
                      <h2 className="section-heading" style={{ fontSize: '38px' }}>
                        {selectedTournament.name}
                      </h2>
                      <p className="section-desc">
                        Direct Page Link:{' '}
                        <a
                          href={`/tournaments/${selectedTournament.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--konami-yellow)', fontWeight: 800 }}
                        >
                          https://efootball2026.online/tournaments/{selectedTournament.id} ↗
                        </a>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="cup-status" style={{ fontSize: '18px' }}>
                        <i /> {selectedTournament.status}
                      </span>
                      <strong style={{ display: 'block', fontSize: '36px', color: 'var(--konami-yellow)', fontFamily: 'var(--font-mono)' }}>
                        {selectedTournament.players.length}/8
                      </strong>
                    </div>
                  </div>

                  <div className="progress-track" style={{ marginBottom: '24px' }}>
                    <i style={{ width: `${(selectedTournament.players.length / 8) * 100}%` }} />
                  </div>

                  {/* PLAYER ROSTER */}
                  <span className="section-index">REGISTERED ROSTER</span>
                  <div className="player-grid-list">
                    {selectedTournament.players.map((p: any, i: number) => (
                      <div className="player-chip" key={p.id || i}>
                        <span>
                          #{String(i + 1).padStart(2, '0')} {p.display_name}
                        </span>
                        <small>{p.efootball_username}</small>
                      </div>
                    ))}
                    {!selectedTournament.players.length && (
                      <div className="ranking-empty">Waiting for players to join via tournament link.</div>
                    )}
                  </div>

                  {/* TOURNAMENT ACTIONS */}
                  <div className="admin-grid-2" style={{ marginTop: '30px' }}>
                    <div>
                      <span className="section-index">STEP 1: BRACKET</span>
                      <p className="section-desc" style={{ margin: '6px 0 14px' }}>
                        Generate the official 8-player single elimination bracket when 8 players are registered.
                      </p>
                      <button
                        className="matchday-button primary full"
                        disabled={selectedTournament.players.length !== 8 || !!selectedTournament.bracket_generated}
                        onClick={() => action(`/api/admin/tournaments/${selectedTournament.id}/bracket`)}
                      >
                        {selectedTournament.bracket_generated ? 'BRACKET GENERATED ✓' : 'GENERATE 8-PLAYER BRACKET ↗'}
                      </button>
                    </div>

                    <div>
                      <span className="section-index">STEP 2: KONAMI CUSTOM ROOM CODE</span>
                      <p className="section-desc" style={{ margin: '6px 0 14px' }}>
                        Enter the room passcode created in eFootball Custom Tournament.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="e.g. 0004-6470-6202"
                          style={{
                            background: '#030a38',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            padding: '10px 14px',
                            color: '#fff',
                            flex: 1,
                          }}
                        />
                        <button
                          className="matchday-button primary"
                          disabled={code.trim().length < 1}
                          onClick={() =>
                            action(`/api/admin/tournaments/${selectedTournament.id}/efootball-id`, {
                              tournament_id: code,
                            })
                          }
                        >
                          Activate Room
                        </button>
                      </div>
                      {selectedTournament.efootball_id && (
                        <p style={{ marginTop: '10px', color: 'var(--konami-yellow)', fontWeight: 800 }}>
                          Active Room Code: {selectedTournament.efootball_id}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {msg && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '8px',
                    background: msg.startsWith('success') ? 'rgba(0,255,100,0.15)' : 'rgba(255,0,0,0.2)',
                    border: '1px solid ' + (msg.startsWith('success') ? 'var(--konami-yellow)' : '#ff4444'),
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                  }}
                >
                  {msg}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="matchday-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="konami-red-logo">KONAMI</span>
            <span className="footer-tagline">
              eFootball <b>2026</b> Organizer Suite
            </span>
          </div>
          <div className="social-links">
            <a href="/">Public Home ↗</a>
            <a href="/#tournaments">All Tournaments ↗</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

