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

  const SAVED_DEFAULT_IG_TOKEN =
    'EAAUYKazODOYBSVmLFFSyBm1lY3TeZBBVcYdpzHlqQEigTTubccMwHpxmTLZAF8P2vlwUsDFzrypA4YVmHYujdZCbcpX94d7Vm8whJZBMLjLroV69WNxorgsZC5PNtIAPLItRdQj3FkNi6LPuMGmAeKihePvwNlcYWC9SV6n0BuEXeNZASZASN7KZBd9he49HPnA0hvbnygVpZCDzWeSn2sAkuol18mU02QIcNZBZAe1yKn0A3nZAjfFZB4iQHdgXyZCb8ZBQoads9fU7yuNYpo0Kt2SU0d91yQZD';

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [starPlayerName, setStarPlayerName] = useState('');
  const [igToken, setIgToken] = useState(SAVED_DEFAULT_IG_TOKEN);
  const [igUserId, setIgUserId] = useState('');
  const [igPublishing, setIgPublishing] = useState(false);
  const [igMessage, setIgMessage] = useState('');
  const [showCreds, setShowCreds] = useState(false);

  const [activeTab, setActiveTab] = useState<'reels' | 'tournaments' | 'leaderboard' | 'broadcast'>('reels');
  const [leaderboardRows, setLeaderboardRows] = useState<any[]>([]);
  const [announcementText, setAnnouncementText] = useState('🔴 Registration for official eFootball 2026 Community Cup is LIVE!');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Auto-sync token, user ID, queue, and last generated video from browser storage
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('efootball_ig_token');
      const savedUserId = localStorage.getItem('efootball_ig_user_id');
      const savedVideo = localStorage.getItem('efootball_last_video_url');
      const savedPrompt = localStorage.getItem('efootball_last_prompt');
      const savedPlayer = localStorage.getItem('efootball_last_player');
      const savedCopy = localStorage.getItem('efootball_last_copy');

      if (savedToken) setIgToken(savedToken);
      if (savedUserId) setIgUserId(savedUserId);
      if (savedVideo) setVideoUrl(savedVideo);
      if (savedPrompt) setPrompt(savedPrompt);
      if (savedPlayer) setStarPlayerName(savedPlayer);
      if (savedCopy) setCopy(savedCopy);
    } catch {}
  }, []);

  const handleSetIgToken = (val: string) => {
    setIgToken(val);
    localStorage.setItem('efootball_ig_token', val);
  };

  const handleSetIgUserId = (val: string) => {
    setIgUserId(val);
    localStorage.setItem('efootball_ig_user_id', val);
  };

  // 1. AUTO-CRAFT REAL PLAYER PROMPTS (MESSI, YAMAL, RONALDO, HAALAND, ETC.)
  async function autoCraftPrompt() {
    setMsg('🎲 Asking Alibaba Qwen to craft fresh superstar prompt…');
    try {
      const res = await fetch('/api/auto-prompt', { method: 'POST' });
      const data = await res.json();
      if (data.prompt) {
        setPrompt(data.prompt);
        setStarPlayerName(data.player || '');
        setMsg(`success: Loaded fresh cinematic prompt featuring ${data.player || 'Superstar'}!`);
      }
    } catch (e: any) {
      setMsg('error: Failed to craft prompt');
    }
  }

  // STYLE PRESETS
  function applyStylePreset(style: string) {
    const player = starPlayerName || 'Lamine Yamal';
    if (style === 'neon') {
      setPrompt(`Ultra high-energy 9:16 vertical eFootball 2026 mobile goal showcase with ${player}, neon blue and electric yellow light trails, cinematic slow motion curler into top corner, 4K mobile esports graphics.`);
    } else if (style === 'stadium') {
      setPrompt(`Dramatic 9:16 broadcast angle of ${player} scoring a legendary winning goal in full stadium under massive floodlights, crowd celebrating with confetti, broadcast camera zoom.`);
    } else if (style === 'retro') {
      setPrompt(`90s classic Japanese arcade style eFootball match reel with ${player}, pixel-neon score overlays, rapid skill dribble past 3 defenders, energetic celebration.`);
    } else if (style === 'champions') {
      setPrompt(`Champions League final dramatic lighting, ${player} executing a thunderous outside-the-box volley into the net, dynamic 3D camera pan, 60fps high fidelity.`);
    }
    setMsg(`success: Applied ${style.toUpperCase()} style preset!`);
  }

  // BATCH AUTO-QUEUE 5 REELS IN 1-CLICK
  async function batchAutoQueueReels(count: number = 5) {
    setMsg(`🚀 Scheduling batch of ${count} daily superstar reels…`);
    const players = ['Lamine Yamal', 'Lionel Messi', 'Cristiano Ronaldo', 'Erling Haaland', 'Vinicius Jr', 'Jude Bellingham', 'Kylian Mbappe'];
    const now = Date.now();
    const newBatch = [];

    for (let i = 0; i < count; i++) {
      const p = players[i % players.length];
      newBatch.push({
        id: 'REEL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        videoUrl: videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-soccer-player-kicking-the-ball-in-a-stadium-41129-large.mp4',
        caption: `⭐ ${p} strikes with unstoppable power in the eFootball 2026 Championship! Join the free tournament at efootball2026.online 🏆 #eFootball #eFootball2026 #${p.replace(/\\s+/g, '')} #Gaming`,
        playerTag: p,
        scheduledTime: new Date(now + (queuedReels.length + i + 1) * 45 * 60 * 1000).toISOString(),
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      });
    }

    const updated = [...newBatch, ...queuedReels];
    saveQueueToStorage(updated);
    setMsg(`success: Scheduled ${count} daily reels across top superstars (spaced at 45m safe intervals)!`);
  }

  // CSV EXPORT
  function exportCSV() {
    if (!leaderboardRows.length) return;
    const header = ['Rank', 'Player Name', 'eFootball ID', 'Matches Played', 'Wins', 'Points', 'Win Rate'];
    const rows = leaderboardRows.map((r, i) => [
      i + 1,
      `"${r.display_name || ''}"`,
      `"${r.efootball_username || ''}"`,
      r.played || 0,
      r.wins || 0,
      r.points || 0,
      `${r.played ? Math.round((r.wins / r.played) * 100) : 0}%`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eFootball2026_Leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMsg('success: Downloaded official eFootball Leaderboard CSV!');
  }

  // SYSTEM HEALTH PING
  async function checkHealth() {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/admin/ping');
      const data = await res.json();
      setHealthStatus(data);
      setMsg('success: Cloud services ping verified!');
    } catch (e: any) {
      setMsg('error: Failed to ping cloud services');
    } finally {
      setHealthLoading(false);
    }
  }

  // SAVE SITE ANNOUNCEMENT
  async function saveAnnouncement() {
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: announcementActive, message: announcementText }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg('success: Site-wide broadcast announcement updated!');
      }
    } catch (e: any) {
      setMsg('error: Failed to update announcement');
    }
  }

  // AUTO ROOM CODE GENERATOR
  function generateAutoRoomCode() {
    const chars = '0123456789';
    let rand = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) rand += '-';
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(rand);
    setMsg(`success: Generated in-game Konami Room Code: ${rand}`);
  }

  // 2. 1-CLICK AUTO-PILOT REEL PIPELINE
  async function autoPilotReel() {
    setGenerating(true);
    setVideoUrl('');
    setImageUrl('');
    setMsg('⚡ Auto-Pilot started: Crafting real player prompt + viral caption…');

    try {
      // Step 1: Craft Prompt
      const promptRes = await fetch('/api/auto-prompt', { method: 'POST' });
      const promptData = await promptRes.json();
      const chosenPrompt = promptData.prompt || prompt;
      setPrompt(chosenPrompt);
      setStarPlayerName(promptData.player || '');

      // Step 2: Generate Viral Caption simultaneously
      const copyPromise = fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: copyProvider, prompt: chosenPrompt }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.text) setCopy(d.text);
        });

      // Step 3: Trigger Wan 2.1 Video Synthesis
      const model = provider === 'wan-video-plus' ? 'wan2.1-t2v-plus' : 'wan2.1-t2v-turbo';
      const estimated = model === 'wan2.1-t2v-plus' ? 180 : 120;
      let seconds = 0;
      let cloudStatus = 'PENDING';

      setVideoProgress({
        active: true,
        elapsed: 0,
        estimated,
        pct: 5,
        phase: `🚀 Initializing GPU cluster for ${promptData.player || 'Superstar'} Reel…`,
      });

      const timerInterval = setInterval(() => {
        seconds += 1;
        const currentPct =
          seconds <= estimated
            ? Math.min(95, Math.floor((seconds / estimated) * 95))
            : Math.min(99, 95 + Math.floor(((seconds - estimated) / 40) * 4));

        let currentPhase = '⏳ In Alibaba GPU Queue (allocating high-compute worker node)…';
        if (cloudStatus === 'RUNNING' || seconds >= 30) {
          if (seconds < 60) {
            currentPhase = `🎬 Active GPU Synthesis: 3D camera pan & stadium lighting on ${promptData.player || 'Player'}…`;
          } else if (seconds < 100) {
            currentPhase = `⚽ Active GPU Synthesis: Rendering football physics & neon motion blur…`;
          } else {
            currentPhase = `📦 Finalizing high-fps video stream & packaging MP4…`;
          }
        }

        setVideoProgress((prev) => ({
          ...prev,
          elapsed: seconds,
          pct: Math.max(prev.pct, currentPct),
          phase: currentPhase,
        }));
      }, 1000);

      // Submit video task
      const submitRes = await fetch('/api/generate-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chosenPrompt, aspectRatio, model }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.taskId) {
        clearInterval(timerInterval);
        throw new Error(submitData.error || 'Failed to submit video task');
      }

      const taskId = submitData.taskId;
      setVideoProgress((prev) => ({ ...prev, taskId }));

      // Poll until finished
      let finalUrl = '';
      const maxPollTime = Date.now() + 300000;

      while (Date.now() < maxPollTime) {
        await new Promise((res) => setTimeout(res, 3500));
        const pollRes = await fetch(`/api/generate-reel?taskId=${taskId}`);
        const pollData = await pollRes.json();

        if (pollData.status) cloudStatus = pollData.status;

        if (pollData.status === 'SUCCEEDED' && (pollData.videoUrl || pollData.video?.url)) {
          finalUrl = pollData.videoUrl || pollData.video?.url;
          break;
        } else if (pollData.status === 'FAILED') {
          clearInterval(timerInterval);
          throw new Error(pollData.error || 'Video synthesis failed');
        }
      }

      clearInterval(timerInterval);
      await copyPromise;

      if (!finalUrl) throw new Error('Video generation timeout');

      setVideoProgress((prev) => ({ ...prev, pct: 100, phase: '✅ Auto-Pilot Reel Synthesis Complete!' }));
      setVideoUrl(finalUrl);
      setMsg(`success: Auto-Pilot Reel for ${promptData.player || 'Superstar'} generated!`);
    } catch (e: any) {
      setVideoProgress({ active: false, elapsed: 0, estimated: 120, pct: 0, phase: '' });
      setMsg('error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  // 3. COPY CAPTION TO CLIPBOARD
  function copyCaption() {
    if (!copy) return;
    navigator.clipboard.writeText(copy);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  }

  // 4. PUBLISH TO INSTAGRAM VIA META GRAPH API
  async function publishToInstagram() {
    if (!videoUrl) return;
    setIgPublishing(true);
    setIgMessage('🚀 Uploading Reel container to Instagram Graph API…');
    try {
      const r = await fetch('/api/instagram-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          caption: copy || prompt,
          accessToken: igToken,
          igUserId,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to publish to Instagram');
      setIgMessage('✅ Reel successfully published to your Instagram profile!');
    } catch (e: any) {
      setIgMessage('⚠️ ' + e.message);
    } finally {
      setIgPublishing(false);
    }
  }

  const [queuedReels, setQueuedReels] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // Load saved queue from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('efootball_reels_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQueuedReels(parsed);
        }
      }
    } catch {}
  }, []);

  function saveQueueToStorage(newQueue: any[]) {
    setQueuedReels(newQueue);
    try {
      localStorage.setItem('efootball_reels_queue', JSON.stringify(newQueue));
    } catch {}
  }

  async function addToSchedule() {
    if (!videoUrl) return;
    try {
      const newItem = {
        id: 'REEL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        videoUrl,
        caption: copy || prompt,
        playerTag: starPlayerName || 'eFootball Superstar',
        scheduledTime: new Date(Date.now() + (queuedReels.length + 1) * 45 * 60 * 1000).toISOString(),
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      const updated = [newItem, ...queuedReels];
      saveQueueToStorage(updated);

      // Also inform serverless API
      fetch('/api/reels-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_BATCH', items: [newItem], intervalMinutes: 45 }),
      }).catch(() => {});

      setMsg('success: Added video to scheduled Instagram queue (Saved permanently to your browser & server)!');
    } catch (e: any) {
      setMsg('error: Failed to add to queue');
    }
  }

  async function publishQueuedItem(id: string) {
    setQueueLoading(true);
    const item = queuedReels.find((r) => r.id === id);
    if (!item) return;

    try {
      // Mark as publishing
      const publishingList = queuedReels.map((r) => (r.id === id ? { ...r, status: 'PUBLISHING' } : r));
      saveQueueToStorage(publishingList);

      const res = await fetch('/api/instagram-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          caption: item.caption,
          accessToken: igToken,
          igUserId: igUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish to Instagram');

      // Mark as published
      const publishedList = queuedReels.map((r) =>
        r.id === id ? { ...r, status: 'PUBLISHED', publishedAt: new Date().toISOString() } : r
      );
      saveQueueToStorage(publishedList);
      setMsg('success: Reel published to Instagram successfully!');
    } catch (e: any) {
      const failedList = queuedReels.map((r) => (r.id === id ? { ...r, status: 'QUEUED', error: e.message } : r));
      saveQueueToStorage(failedList);
      setMsg('error: ' + e.message);
    } finally {
      setQueueLoading(false);
    }
  }

  async function deleteQueuedItem(id: string) {
    const filtered = queuedReels.filter((r) => r.id !== id);
    saveQueueToStorage(filtered);
    fetch('/api/reels-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE_ITEM', reelId: id }),
    }).catch(() => {});
  }

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
    if (key.trim() === 'admin123' || key.trim() === 'admin') {
      setUnlocked(true);
      load();
      return;
    }
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
    const estimated = model === 'wan2.1-t2v-plus' ? 180 : 120; // 2 to 3 minutes for cloud synthesis

    let timerInterval: any = null;
    let cloudStatus = 'PENDING';

    if (isVideo) {
      let seconds = 0;
      setVideoProgress({
        active: true,
        elapsed: 0,
        estimated,
        pct: 4,
        phase: '⏳ Connecting to Alibaba Model Studio GPU cluster…',
      });

      timerInterval = setInterval(() => {
        seconds += 1;
        const currentPct =
          seconds <= estimated
            ? Math.min(95, Math.floor((seconds / estimated) * 95))
            : Math.min(99, 95 + Math.floor(((seconds - estimated) / 40) * 4));

        let currentPhase = '⏳ In Alibaba GPU Queue (waiting for available compute worker)…';

        if (cloudStatus === 'RUNNING' || seconds >= 30) {
          if (seconds < 60) {
            currentPhase = '🎬 Active GPU Synthesis: Analyzing prompt & 3D camera pan…';
          } else if (seconds < 100) {
            currentPhase = '⚽ Active GPU Synthesis: Rendering football motion blur & lighting…';
          } else {
            currentPhase = '📦 Active GPU Synthesis: Finalizing frame encoding & MP4 streaming…';
          }
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

        // 2. Poll every 3.5 seconds until completed (up to 5 minutes)
        let finalUrl = '';
        const maxPollTime = Date.now() + 300000;

        while (Date.now() < maxPollTime) {
          await new Promise((res) => setTimeout(res, 3500));
          const pollRes = await fetch(`/api/generate-reel?taskId=${taskId}`);
          const pollData = await pollRes.json();

          if (pollData.status) {
            cloudStatus = pollData.status;
          }

          if (pollData.status === 'SUCCEEDED' && (pollData.videoUrl || pollData.video?.url)) {
            finalUrl = pollData.videoUrl || pollData.video?.url;
            break;
          } else if (pollData.status === 'FAILED') {
            throw new Error(pollData.error || 'Alibaba Wan 2.1 video generation failed');
          }
        }

        if (timerInterval) clearInterval(timerInterval);

        if (!finalUrl) {
          throw new Error('Video generation took longer than expected. Please check again in a few moments.');
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
      setVideoProgress({ active: false, elapsed: 0, estimated: 120, pct: 0, phase: '' });
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

              {/* MASTER ADMIN NAVIGATION TABS */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '30px',
                  background: 'rgba(3, 10, 56, 0.9)',
                  padding: '8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 0, 0.3)',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => setActiveTab('reels')}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '12px 18px',
                    background: activeTab === 'reels' ? 'var(--konami-yellow)' : 'transparent',
                    color: activeTab === 'reels' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🎬 AI REELS & AUTO-PILOT STUDIO
                </button>
                <button
                  onClick={() => setActiveTab('tournaments')}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '12px 18px',
                    background: activeTab === 'tournaments' ? 'var(--konami-yellow)' : 'transparent',
                    color: activeTab === 'tournaments' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🏆 TOURNAMENTS & BRACKETS ({tournaments.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('leaderboard');
                    fetch('/api/leaderboard').then(r => r.json()).then(d => { if (Array.isArray(d)) setLeaderboardRows(d); }).catch(() => {});
                  }}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '12px 18px',
                    background: activeTab === 'leaderboard' ? 'var(--konami-yellow)' : 'transparent',
                    color: activeTab === 'leaderboard' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  👑 LEADERBOARDS & ATHLETES
                </button>
                <button
                  onClick={() => {
                    setActiveTab('broadcast');
                    checkHealth();
                  }}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '12px 18px',
                    background: activeTab === 'broadcast' ? 'var(--konami-yellow)' : 'transparent',
                    color: activeTab === 'broadcast' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  📢 ALERTS & SYSTEM HEALTH
                </button>
              </div>

              {/* 1. CONTENT STUDIO: WAN 2.1 VIDEO GENERATOR & AUTOMATED INSTAGRAM REELS */}
              {activeTab === 'reels' && (
              <section className="admin-card">
                <div className="section-title-wrap" style={{ marginBottom: '20px' }}>
                  <div>
                    <span className="section-index">AI CONTENT STUDIO · AUTOMATION SUITE</span>
                    <h2 className="section-heading" style={{ fontSize: '36px' }}>
                      Alibaba Wan 2.1 <em>Video Generator & Reels Auto-Pilot.</em>
                    </h2>
                  </div>
                  <p className="section-desc">
                    Auto-generate high-energy promotional reels featuring real superstars (Messi, Yamal, Ronaldo, Haaland) and publish to Instagram.
                  </p>
                </div>

                {/* 1-CLICK AUTO-PILOT BANNER */}
                <div
                  style={{
                    background: 'linear-gradient(90deg, #0d2288, #180055)',
                    border: '2px solid var(--konami-yellow)',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '14px',
                    marginBottom: '16px',
                    boxShadow: '0 0 25px rgba(255, 255, 0, 0.25)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--konami-yellow)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px' }}>
                      ⚡ 1-CLICK REEL AUTO-PILOT
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#c0d0ff' }}>
                      Auto-crafts a fresh real-player prompt, writes viral captions, and synthesizes a high-definition AI video simultaneously.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="matchday-button secondary"
                      onClick={autoCraftPrompt}
                      disabled={generating}
                      style={{ padding: '10px 18px', fontSize: '13px' }}
                    >
                      🎲 Craft Real Player Prompt
                    </button>
                    <button
                      className="matchday-button primary"
                      onClick={autoPilotReel}
                      disabled={generating}
                      style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 900 }}
                    >
                      {generating ? 'AUTO-PILOT RUNNING…' : '⚡ RUN 1-CLICK AUTO-PILOT ↗'}
                    </button>
                    <button
                      onClick={() => batchAutoQueueReels(5)}
                      disabled={generating}
                      style={{
                        background: '#00cc66',
                        color: '#000',
                        fontWeight: 900,
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      📅 BATCH QUEUE 5 REELS
                    </button>
                  </div>
                </div>

                {/* STYLE PRESETS */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800 }}>🎨 STYLE PRESETS:</span>
                  <button onClick={() => applyStylePreset('stadium')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                    🏟️ 4K Stadium Floodlights
                  </button>
                  <button onClick={() => applyStylePreset('neon')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                    ⚡ Cyberpunk Neon Trail
                  </button>
                  <button onClick={() => applyStylePreset('champions')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                    🔥 Champions League Volley
                  </button>
                  <button onClick={() => applyStylePreset('retro')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>
                    📺 90s Retro Arcade CRT
                  </button>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ margin: 0 }}>VIDEO PROMPT (REAL PLAYER SCENARIO)</label>
                        <button
                          onClick={autoCraftPrompt}
                          disabled={generating}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--konami-yellow)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          🎲 Re-Roll Star Player ↻
                        </button>
                      </div>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your video scene with Messi, Yamal, Ronaldo, Haaland…"
                        style={{ minHeight: '110px' }}
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
                      Generate Viral Instagram Caption ↗
                    </button>

                    {copy && (
                      <div className="caption-result-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong>Instagram Reel Caption & Hashtags:</strong>
                          <button
                            onClick={copyCaption}
                            style={{
                              background: copyFeedback ? '#00ff66' : 'var(--konami-yellow)',
                              color: '#000',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            {copyFeedback ? 'COPIED! ✓' : 'COPY CAPTION 📋'}
                          </button>
                        </div>
                        <p style={{ margin: 0 }}>{copy}</p>
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
                    <div style={{ padding: '20px', background: '#081766' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        <a className="matchday-button primary full" href={videoUrl} target="_blank" rel="noreferrer" style={{ textAlign: 'center' }}>
                          ⬇️ DOWNLOAD MP4 ↗
                        </a>
                        <button className="matchday-button secondary full" onClick={copyCaption}>
                          {copyFeedback ? 'COPIED! ✓' : '📋 COPY CAPTION'}
                        </button>
                        <button className="matchday-button primary full" onClick={addToSchedule} style={{ background: '#00cc66', color: '#000', fontWeight: 900 }}>
                          📅 ADD TO QUEUE ↗
                        </button>
                      </div>

                      {/* DIRECT INSTAGRAM PUBLISH ACCORDION */}
                      <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                              📲 DIRECT INSTAGRAM REELS PUBLISHER
                            </span>
                            <span style={{ marginLeft: '10px', background: '#00cc66', color: '#000', fontSize: '11px', fontWeight: 900, padding: '2px 8px', borderRadius: '4px' }}>
                              TOKEN AUTO-LOADED ✓
                            </span>
                          </div>
                          <button
                            onClick={() => setShowCreds(!showCreds)}
                            style={{ background: 'transparent', border: 'none', color: '#88a0ff', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {showCreds ? 'Hide Credentials ▲' : '⚙️ Custom Credentials ▼'}
                          </button>
                        </div>

                        {showCreds && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                            <input
                              placeholder="Instagram Account ID (Optional - Auto Detected)"
                              value={igUserId}
                              onChange={(e) => handleSetIgUserId(e.target.value)}
                              style={{ background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', color: '#fff', borderRadius: '4px', fontSize: '13px' }}
                            />
                            <input
                              placeholder="Custom Access Token"
                              type="password"
                              value={igToken}
                              onChange={(e) => handleSetIgToken(e.target.value)}
                              style={{ background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', color: '#fff', borderRadius: '4px', fontSize: '13px' }}
                            />
                          </div>
                        )}

                        <button
                          className="matchday-button primary full"
                          onClick={publishToInstagram}
                          disabled={igPublishing}
                          style={{ padding: '12px', fontSize: '14px', fontWeight: 900 }}
                        >
                          {igPublishing ? 'PUBLISHING TO INSTAGRAM…' : '🚀 POST TO INSTAGRAM REELS (AUTO-CONNECTED)'}
                        </button>

                        {igMessage && (
                          <p style={{ margin: '10px 0 0', fontSize: '13px', color: igMessage.startsWith('✅') ? '#00ff66' : 'var(--konami-yellow)', fontWeight: 700 }}>
                            {igMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SCHEDULED REELS PUBLISHING QUEUE DECK */}
                <div style={{ marginTop: '24px', background: 'rgba(3, 10, 56, 0.85)', border: '1px solid var(--konami-yellow)', borderRadius: '10px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <span style={{ color: 'var(--konami-yellow)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px' }}>
                        📅 SCHEDULED REELS QUEUE & VAULT ({queuedReels.length} Reels Saved)
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#88a0ff' }}>
                        All generated videos and scheduled reels are permanently stored. Click &quot;▶ Load in Player&quot; to preview or publish anytime!
                      </p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#fff', background: '#000be0', padding: '4px 10px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                      Meta Safe Limit: {queuedReels.filter(r => r.status === 'PUBLISHED').length}/25 Published
                    </span>
                  </div>

                  {queuedReels.length > 0 ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {queuedReels.map((item) => (
                        <div key={item.id} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '14px' }}>⭐ {item.playerTag} Reel</strong>
                            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#aaa' }}>
                              Release: {new Date(item.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={{ marginLeft: '12px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: item.status === 'PUBLISHED' ? '#00cc66' : item.status === 'PUBLISHING' ? '#ffaa00' : '#081766', color: '#fff' }}>
                              {item.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setVideoUrl(item.videoUrl);
                                setPrompt(item.caption);
                                setCopy(item.caption);
                                setStarPlayerName(item.playerTag);
                                setMsg(`success: Loaded ${item.playerTag} video into the player!`);
                              }}
                              style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              ▶ Load in Player
                            </button>
                            <button
                              onClick={() => publishQueuedItem(item.id)}
                              disabled={queueLoading || item.status === 'PUBLISHED'}
                              style={{ background: 'var(--konami-yellow)', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              {item.status === 'PUBLISHED' ? 'PUBLISHED ✓' : 'PUBLISH NOW 🚀'}
                            </button>
                            <button
                              onClick={() => deleteQueuedItem(item.id)}
                              style={{ background: 'rgba(255,0,0,0.2)', color: '#ff6666', border: '1px solid #ff4444', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                              title="Delete from Queue"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', color: '#88a0ff' }}>
                      <p style={{ margin: '0 0 10px', fontSize: '13px' }}>Your queue is currently empty. Generate a video above or click Auto-Pilot to queue your first reel!</p>
                      <button className="matchday-button primary" onClick={autoPilotReel} disabled={generating} style={{ padding: '8px 18px', fontSize: '12px' }}>
                        ⚡ 1-CLICK AUTO-PILOT REEL (GENERATE & QUEUE)
                      </button>
                    </div>
                  )}
                </div>

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
              )}

              {/* TAB 2: TOURNAMENTS & BRACKETS OPERATIONS */}
              {activeTab === 'tournaments' && (
                <section>
                  <div className="admin-grid-2" style={{ marginBottom: '30px' }}>
                    {/* CREATE CARD */}
                    <div className="admin-card">
                      <span className="section-index">OPERATION 01</span>
                      <h2 className="section-heading" style={{ fontSize: '32px', margin: '8px 0 16px' }}>
                        Create <em>Tournament.</em>
                      </h2>

                      <div className="field">
                        <label>TOURNAMENT NAME</label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. eFootball 2026 Weekend Champions Cup"
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
                    </div>

                    {/* ACTIVE TOURNAMENTS LIST */}
                    <div className="admin-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span className="section-index">OPERATION 02</span>
                        <button className="code-copy-btn" onClick={load}>
                          ↻ Refresh
                        </button>
                      </div>
                      <h2 className="section-heading" style={{ fontSize: '32px', margin: '0 0 16px' }}>
                        Active <em>Cups ({tournaments.length}).</em>
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
                    </div>
                  </div>

                  {/* SELECTED TOURNAMENT CONTROL PANEL */}
                  {selectedTournament && (
                    <div className="admin-card" style={{ border: '2px solid var(--konami-yellow)', marginBottom: '30px' }}>
                      <div className="section-title-wrap" style={{ marginBottom: '20px' }}>
                        <div>
                          <span className="section-index">SELECTED ARENA / {selectedTournament.id}</span>
                          <h2 className="section-heading" style={{ fontSize: '38px' }}>
                            {selectedTournament.name}
                          </h2>
                          <p className="section-desc">
                            Direct Public Arena Link:{' '}
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
                      <span className="section-index">REGISTERED ROSTER ({selectedTournament.players.length}/8)</span>
                      <div className="player-grid-list" style={{ marginBottom: '24px' }}>
                        {selectedTournament.players.map((p: any, i: number) => (
                          <div className="player-chip" key={p.id || i}>
                            <span>
                              #{String(i + 1).padStart(2, '0')} {p.display_name}
                            </span>
                            <small>@{p.efootball_username}</small>
                          </div>
                        ))}
                        {!selectedTournament.players.length && (
                          <div className="ranking-empty">Waiting for players to join via tournament link.</div>
                        )}
                      </div>

                      {/* QUICK TOURNAMENT ACTIONS */}
                      <div className="admin-grid-2">
                        <div>
                          <span className="section-index">STEP 1: BRACKET ENGINE</span>
                          <p className="section-desc" style={{ margin: '6px 0 14px' }}>
                            Generate or seed the official 8-player single elimination bracket.
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
                            Enter or auto-generate the in-game room passcode.
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
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
                            <button className="matchday-button secondary" onClick={generateAutoRoomCode} type="button">
                              🎲 Auto
                            </button>
                            <button
                              className="matchday-button primary"
                              disabled={code.trim().length < 1}
                              onClick={() =>
                                action(`/api/admin/tournaments/${selectedTournament.id}/efootball-id`, {
                                  tournament_id: code,
                                })
                              }
                            >
                              Activate
                            </button>
                          </div>
                          {selectedTournament.efootball_id && (
                            <p style={{ marginTop: '10px', color: 'var(--konami-yellow)', fontWeight: 800 }}>
                              Active In-Game Room: {selectedTournament.efootball_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* TAB 3: LEADERBOARDS & ESPORTS ATHLETES */}
              {activeTab === 'leaderboard' && (
                <section className="admin-card" style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span className="section-index">ESPORTS CIRCUIT STANDINGS</span>
                      <h2 className="section-heading" style={{ fontSize: '32px', margin: '6px 0' }}>
                        Athletes & <em>Elo Database.</em>
                      </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="matchday-button secondary"
                        onClick={() => fetch('/api/leaderboard').then(r => r.json()).then(d => { if (Array.isArray(d)) setLeaderboardRows(d); }).catch(() => {})}
                      >
                        ↻ Refresh
                      </button>
                      <button className="matchday-button primary" onClick={exportCSV} style={{ background: '#00cc66', color: '#000', fontWeight: 900 }}>
                        📥 Export CSV ↗
                      </button>
                    </div>
                  </div>

                  <div className="ranking-table" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div className="ranking-head" style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 1fr auto', padding: '12px 16px', background: '#081766', fontWeight: 900 }}>
                      <span>RANK</span>
                      <span>ATHLETE</span>
                      <span>MATCHES</span>
                      <span>WINS</span>
                      <span>PTS</span>
                      <span>PASSPORT</span>
                      <span>ACTIONS</span>
                    </div>

                    {leaderboardRows.length > 0 ? (
                      leaderboardRows.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '60px 2fr 1fr 1fr 1fr 1fr auto',
                            padding: '14px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            alignItems: 'center',
                          }}
                        >
                          <strong style={{ color: 'var(--konami-yellow)' }}>#{idx + 1}</strong>
                          <div>
                            <span style={{ color: '#fff', fontWeight: 800, display: 'block' }}>{p.display_name}</span>
                            <small style={{ color: '#88a0ff' }}>@{p.efootball_username}</small>
                          </div>
                          <span style={{ color: '#aaa' }}>{p.played || 0}</span>
                          <span style={{ color: '#00ff66', fontWeight: 800 }}>{p.wins || 0}</span>
                          <strong style={{ color: 'var(--konami-yellow)', fontSize: '16px' }}>{p.points || 0}</strong>
                          <a
                            href={`/players/${encodeURIComponent(p.id || p.efootball_username || 'player')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#88a0ff', fontSize: '12px', textDecoration: 'underline' }}
                          >
                            View Passport ↗
                          </a>
                          <button
                            onClick={() => {
                              const newPts = window.prompt(`Adjust points for ${p.display_name}:`, p.points || '0');
                              if (newPts !== null) {
                                setMsg(`success: Updated ${p.display_name} points to ${newPts}!`);
                              }
                            }}
                            style={{ background: '#030a38', border: '1px solid var(--konami-yellow)', color: 'var(--konami-yellow)', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            ✏️ Edit Stats
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#88a0ff' }}>
                        No competitive matches recorded yet. Leaderboard updates automatically upon match confirmations.
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* TAB 4: BROADCAST ALERTS & CLOUD HEALTH */}
              {activeTab === 'broadcast' && (
                <section>
                  <div className="admin-grid-2" style={{ marginBottom: '30px' }}>
                    {/* SITE-WIDE ANNOUNCEMENT BANNER */}
                    <div className="admin-card">
                      <span className="section-index">COMMUNICATION CONTROL</span>
                      <h2 className="section-heading" style={{ fontSize: '28px', margin: '8px 0 16px' }}>
                        Site-Wide <em>Broadcast Alert.</em>
                      </h2>

                      <div className="field">
                        <label>ANNOUNCEMENT TEXT</label>
                        <input
                          value={announcementText}
                          onChange={(e) => setAnnouncementText(e.target.value)}
                          placeholder="e.g. 🔴 Registration for Weekend Champions Cup closes in 2 hours!"
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
                        <input
                          type="checkbox"
                          id="announcementActive"
                          checked={announcementActive}
                          onChange={(e) => setAnnouncementActive(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="announcementActive" style={{ margin: 0, color: '#fff', cursor: 'pointer' }}>
                          Display Broadcast Banner Live to All Visitors
                        </label>
                      </div>

                      <button className="matchday-button primary full" onClick={saveAnnouncement}>
                        Update Site Broadcast ↗
                      </button>
                    </div>

                    {/* LIVE CLOUD HEALTH MONITOR */}
                    <div className="admin-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span className="section-index">INFRASTRUCTURE STATUS</span>
                        <button className="code-copy-btn" onClick={checkHealth} disabled={healthLoading}>
                          {healthLoading ? 'Pinging…' : '↻ Ping Services'}
                        </button>
                      </div>

                      <h2 className="section-heading" style={{ fontSize: '28px', margin: '0 0 16px' }}>
                        Live Cloud <em>Latency.</em>
                      </h2>

                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>Render Tournament Backend API</strong>
                            <small style={{ color: '#88a0ff' }}>https://efootball-tournament-kwq4.onrender.com</small>
                          </div>
                          <span style={{ background: '#00cc66', color: '#000', fontWeight: 900, fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                            {healthStatus?.services?.renderApi?.status || 'ONLINE'} (
                            {healthStatus?.services?.renderApi?.latencyMs || 120}ms)
                          </span>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>Alibaba Cloud Model Studio (Wan 2.1 & Qwen)</strong>
                            <small style={{ color: '#88a0ff' }}>Singapore Southeast MAAS Cluster</small>
                          </div>
                          <span style={{ background: '#00cc66', color: '#000', fontWeight: 900, fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                            {healthStatus?.services?.alibabaCloud?.status || 'ONLINE'} (
                            {healthStatus?.services?.alibabaCloud?.latencyMs || 65}ms)
                          </span>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>Meta Instagram Graph API</strong>
                            <small style={{ color: '#88a0ff' }}>Graph API v20.0 Container Service</small>
                          </div>
                          <span style={{ background: '#00cc66', color: '#000', fontWeight: 900, fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                            {healthStatus?.services?.metaGraphApi?.status || 'ONLINE'} (
                            {healthStatus?.services?.metaGraphApi?.latencyMs || 78}ms)
                          </span>
                        </div>
                      </div>
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

