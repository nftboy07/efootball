'use client';
import { useEffect, useState } from 'react';
const API=process.env.NEXT_PUBLIC_API_URL||'https://efootball-tournament-kwq4.onrender.com';
type Tournament={id:string;name:string;status:string;players:any[];max_players:number;efootball_id?:string|null;bracket_generated?:boolean};
async function api(path:string,init?:RequestInit){const r=await fetch(API+path,init);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||'Request failed');return d}
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState('');
  const [msg, setMsg] = useState('');

  const selectedTournament = tournaments.find((t) => t.id === selected);
  const headers = () => ({ 'Content-Type': 'application/json', 'X-Admin-Key': key });

  async function load() {
    try {
      setTournaments(await api('/api/tournaments'));
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
      setMsg('Invalid admin password');
    }
  }

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked]);

  async function create() {
    try {
      const t = await api('/api/admin/tournaments', { method: 'POST', headers: headers(), body: JSON.stringify({ name }) });
      setName('');
      setSelected(t.id);
      setMsg('Tournament created. Share its page link with players.');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function action(path: string, body?: object) {
    try {
      await api(path, { method: 'POST', headers: headers(), body: body ? JSON.stringify(body) : undefined });
      setMsg('Updated successfully.');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function generateMedia() {
    setGenerating(true);
    setVideoUrl('');
    setImageUrl('');
    setMsg('Synthesizing media… (Wan 2.1 AI video generation takes ~30-60s)');
    try {
      const isVideo = provider.startsWith('wan-video') || provider === 'veo-video';
      const endpoint = isVideo ? '/api/generate-reel' : '/api/generate-media';
      const model = provider === 'wan-video-plus' ? 'wan2.1-t2v-plus' : 'wan2.1-t2v-turbo';
      const payload = isVideo ? { prompt, aspectRatio, model } : { prompt, provider, aspectRatio };

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Generation failed');

      const url = d.video?.url || d.media?.url || d.url || '';
      if (isVideo) setVideoUrl(url);
      else setImageUrl(url);

      setMsg('Media generated successfully.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function generateCopy() {
    setGenerating(true);
    setCopy('');
    setMsg('Generating caption…');
    try {
      const r = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: copyProvider, prompt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Copy generation failed');
      setCopy(d.text || '');
      setMsg('Caption generated successfully.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="shell">
      <header className="nav">
        <a className="brand" href="/">
          eFootball<span>2026</span>
        </a>
        {unlocked && <span className="pill">ADMIN</span>}
      </header>
      <main className="section admin-page">
        {!unlocked ? (
          <section className="card admin-login">
            <span className="eyebrow">PRIVATE AREA</span>
            <h1>Admin access.</h1>
            <p className="muted">Enter the private admin password to manage tournaments and player registrations.</p>
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
                placeholder="Enter password"
              />
            </div>
            <button className="btn primary full" onClick={unlock} disabled={!key}>
              UNLOCK ADMIN PANEL
            </button>
            {msg && <p className="error">{msg}</p>}
          </section>
        ) : (
          <>
            <div className="topline">
              <div>
                <span className="eyebrow">TOURNAMENT CONTROL</span>
                <h1>Run your community cup.</h1>
                <p className="muted">
                  Create a tournament, track all eight website registrations, then connect the KONAMI Custom Tournament room.
                </p>
              </div>
            </div>
            <section className="card reel-generator">
              <span className="eyebrow">CONTENT STUDIO</span>
              <h2>Create Tournament Media</h2>
              <p className="muted">Generate AI videos with Wan 2.1 (Alibaba Cloud Model Studio) or social graphics.</p>
              <div className="field">
                <label>MODEL</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="wan-video-turbo">Wan 2.1 Video Turbo · Alibaba Cloud Model Studio</option>
                  <option value="wan-video-plus">Wan 2.1 Video Plus · Alibaba Cloud Model Studio</option>
                  <option value="pollinations-image">Pollinations · FLUX Image · Free</option>
                  <option value="hf-image">Hugging Face · FLUX Image · HF_TOKEN</option>
                  <option value="veo-video">Google Veo Video · Vercel Gateway</option>
                </select>
              </div>
              <div className="field">
                <label>PROMPT</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              </div>
              <div className="reel-options">
                <div className="field">
                  <label>FORMAT</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                    <option value="9:16">9:16 vertical (Instagram Reels / TikTok)</option>
                    <option value="16:9">16:9 landscape (YouTube / Twitch)</option>
                    <option value="1:1">1:1 square (Feed post)</option>
                  </select>
                </div>
                <button className="btn primary" onClick={generateMedia} disabled={generating || prompt.trim().length < 5}>
                  {generating ? 'GENERATING…' : 'GENERATE AI VIDEO / MEDIA'}
                </button>
              </div>
              {videoUrl && (
                <div className="reel-result">
                  <video controls src={videoUrl} autoPlay loop />
                  <a className="btn full" href={videoUrl} target="_blank" rel="noreferrer">
                    OPEN / DOWNLOAD MP4 VIDEO ↗
                  </a>
                </div>
              )}
              {imageUrl && (
                <div className="reel-result">
                  <img src={imageUrl} alt="Generated tournament promotion" />
                  <a className="btn full" href={imageUrl} target="_blank" rel="noreferrer">
                    OPEN / DOWNLOAD IMAGE ↗
                  </a>
                </div>
              )}
              <div className="copy-generator">
                <div className="field">
                  <label>CAPTION MODEL</label>
                  <select value={copyProvider} onChange={(e) => setCopyProvider(e.target.value)}>
                    <option value="qwen">Alibaba Qwen Plus · Model Studio</option>
                    <option value="openrouter">OpenRouter · Llama 3.3 70B</option>
                    <option value="groq">Groq · Llama 3.3</option>
                    <option value="nvidia">NVIDIA · Llama 3.1</option>
                  </select>
                </div>
                <button className="btn" onClick={generateCopy} disabled={generating}>
                  GENERATE INSTAGRAM CAPTION
                </button>
                {copy && <textarea className="generated-copy" value={copy} readOnly />}
              </div>
            </section>
            <div className="admin-layout">
              <section className="card">
                <span className="eyebrow">CREATE</span>
                <h2>New tournament</h2>
                <div className="field">
                  <label>Tournament name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="eFootball 2026 Community Cup #1" />
                </div>
                <button className="btn primary full" onClick={create} disabled={name.trim().length < 2}>
                  CREATE TOURNAMENT
                </button>
                {msg && <p className={msg.includes('success') || msg.includes('created') ? 'success' : 'error'}>{msg}</p>}
              </section>
              <section className="card">
                <span className="eyebrow">LIVE REGISTRATION</span>
                <h2>Player count</h2>
                <button className="btn full" onClick={load}>
                  REFRESH COUNTS
                </button>
                <div className="admin-list">
                  {tournaments.map((t) => (
                    <button
                      className={'admin-tournament ' + (selected === t.id ? 'active' : '')}
                      key={t.id}
                      onClick={() => setSelected(t.id)}
                    >
                      <span>
                        <strong>{t.name}</strong>
                        <small>
                          {t.id} · {t.status}
                        </small>
                      </span>
                      <b>
                        {t.players.length}/{t.max_players}
                      </b>
                    </button>
                  ))}
                  {!tournaments.length && <p className="muted">No tournaments created yet.</p>}
                </div>
              </section>
            </div>
            {selectedTournament && (
              <section className="card admin-actions">
                <div className="topline">
                  <div>
                    <span className="eyebrow">SELECTED TOURNAMENT</span>
                    <h2>{selectedTournament.name}</h2>
                    <p className="muted">
                      Share:{' '}
                      {typeof window !== 'undefined' ? window.location.origin : ''}/tournaments/
                      {selectedTournament.id}
                    </p>
                  </div>
                  <div className="count-badge">
                    {selectedTournament.players.length}
                    <span>/8 PLAYERS</span>
                  </div>
                </div>
                <div className="admin-progress">
                  <i style={{ width: `${(selectedTournament.players.length / 8) * 100}%` }} />
                </div>
                <div className="player-list">
                  {selectedTournament.players.map((p: any, i: number) => (
                    <div className="playerrow" key={p.id}>
                      <span>
                        {i + 1}. {p.display_name}
                      </span>
                      <span className="muted">{p.efootball_username}</span>
                    </div>
                  ))}
                  {!selectedTournament.players.length && <p className="muted">Waiting for players to register.</p>}
                </div>
                <div className="admin-controls">
                  <button
                    className="btn"
                    disabled={selectedTournament.players.length !== 8 || !!selectedTournament.bracket_generated}
                    onClick={() => action(`/api/admin/tournaments/${selectedTournament.id}/bracket`)}
                  >
                    GENERATE BRACKET
                  </button>
                  <div className="field inline-field">
                    <label>KONAMI TOURNAMENT ID</label>
                    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="0004-6470-6202" />
                  </div>
                  <button
                    className="btn primary"
                    disabled={
                      selectedTournament.players.length !== 8 ||
                      !selectedTournament.bracket_generated ||
                      code.trim().length < 1
                    }
                    onClick={() => action(`/api/admin/tournaments/${selectedTournament.id}/efootball-id`, { tournament_id: code })}
                  >
                    ACTIVATE ROOM
                  </button>
                </div>
                {selectedTournament.efootball_id && (
                  <div className="notice">
                    KONAMI room active: <strong>{selectedTournament.efootball_id}</strong>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <footer className="footer">Admin access is protected by your API ADMIN_KEY.</footer>
    </div>
  );
}
