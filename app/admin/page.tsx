'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/Toast';

type Tournament = {
  id: string;
  name: string;
  status: string;
  players: any[];
  max_players: number;
  efootball_id?: string | null;
  bracket_generated?: boolean;
  prize_pool?: string;
  match_time?: string;
};

async function api(path: string, init?: RequestInit) {
  const stripped = path.startsWith('/api/') ? path.slice(5) : path.replace(/^\//, '');
  const r = await fetch('/api/backend/' + stripped, { credentials: 'include', ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || d.error || 'Request failed');
  return d;
}

async function localApi(path: string, init?: RequestInit) {
  const r = await fetch(path, { credentials: 'include', ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || d.detail || 'Request failed');
  return d;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'reels' | 'tournaments' | 'leaderboard' | 'broadcast'>('reels');

  // Tournaments state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [prizePool, setPrizePool] = useState('Free entry · Community cup');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsgRaw] = useState('');
  const toast = useToast();
  // Every existing setMsg('success: …') / setMsg('error: …') call now also
  // raises a toast, so feedback is visible without scrolling to the top.
  const setMsg = (m: string) => {
    setMsgRaw(m);
    toast.pushLegacy(m);
  };
  const [arenaMatches, setArenaMatches] = useState<any[]>([]);
  const [reportMatchId, setReportMatchId] = useState('');

  // Match score reporter
  const [scoreP1, setScoreP1] = useState(2);
  const [scoreP2, setScoreP2] = useState(1);

  // AI Reels & Studio state
  const [prompt, setPrompt] = useState(
    'Ultra high-energy 9:16 vertical eFootball 2026 mobile gameplay reel featuring Lamine Yamal scoring a curling top-corner stunner, stadium spotlights, electric yellow and blue neon trails, 4K esports graphics.'
  );
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [provider, setProvider] = useState('wan-video-turbo');
  const [copyProvider, setCopyProvider] = useState('qwen');
  const [audioPreset, setAudioPreset] = useState('stadium-roar');
  const [watermarkText, setWatermarkText] = useState('@efootball2026.online');
  const [showWatermark, setShowWatermark] = useState(true);
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

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [starPlayerName, setStarPlayerName] = useState('Lamine Yamal');
  const [igToken, setIgToken] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [igPublishing, setIgPublishing] = useState(false);
  const [igMessage, setIgMessage] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [igHealth, setIgHealth] = useState<any>(null);
  const [igConnecting, setIgConnecting] = useState(false);

  // Queue state
  const [queuedReels, setQueuedReels] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  // Leaderboard state
  const [leaderboardRows, setLeaderboardRows] = useState<any[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerId, setNewPlayerId] = useState('');

  // Broadcast & Health state
  const [announcementText, setAnnouncementText] = useState('🔴 Registration for official eFootball 2026 Community Cup is LIVE!');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [pendingSubs, setPendingSubs] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Storage synchronization on mount
  useEffect(() => {
    try {
      const savedUserId = localStorage.getItem('efootball_ig_user_id');
      const savedVideo = localStorage.getItem('efootball_last_video_url');
      const savedPrompt = localStorage.getItem('efootball_last_prompt');
      const savedPlayer = localStorage.getItem('efootball_last_player');
      const savedCopy = localStorage.getItem('efootball_last_copy');
      const savedQueue = localStorage.getItem('efootball_reels_queue');

      if (savedUserId) setIgUserId(savedUserId);
      if (savedVideo) setVideoUrl(savedVideo);
      if (savedPrompt) setPrompt(savedPrompt);
      if (savedPlayer) setStarPlayerName(savedPlayer);
      if (savedCopy) setCopy(savedCopy);

      if (savedQueue) {
        const parsed = JSON.parse(savedQueue);
        if (Array.isArray(parsed) && parsed.length > 0) setQueuedReels(parsed);
      }
    } catch {}
  }, []);

  function saveQueueLocal(newQueue: any[]) {
    setQueuedReels(newQueue);
    try {
      localStorage.setItem('efootball_reels_queue', JSON.stringify(newQueue));
    } catch {}
  }

  async function persistQueue(newQueue: any[]) {
    saveQueueLocal(newQueue);
    try {
      await localApi('/api/reels-queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: newQueue }),
      });
    } catch {}
  }

  function saveQueueToStorage(newQueue: any[]) {
    void persistQueue(newQueue);
  }

  // 1. AUTO-CRAFT PROMPT
  async function autoCraftPrompt() {
    setMsg('🎲 Asking Alibaba Qwen to craft fresh superstar prompt…');
    try {
      const res = await fetch('/api/auto-prompt', { method: 'POST' });
      const data = await res.json();
      if (data.prompt) {
        setPrompt(data.prompt);
        setStarPlayerName(data.player || 'Superstar');
        try {
          localStorage.setItem('efootball_last_prompt', data.prompt);
          localStorage.setItem('efootball_last_player', data.player || 'Superstar');
        } catch {}
        setMsg(`success: Loaded fresh cinematic prompt featuring ${data.player || 'Superstar'}!`);
      }
    } catch (e: any) {
      setMsg('error: Failed to craft prompt');
    }
  }

  // 8 VIRAL STYLE PRESETS
  function applyStylePreset(style: string) {
    const player = starPlayerName || 'Lamine Yamal';
    let p = '';
    if (style === 'neon') {
      p = `Ultra high-energy 9:16 vertical eFootball 2026 mobile goal showcase with ${player}, neon blue and electric yellow light trails, cinematic slow motion curler into top corner, 4K mobile esports graphics.`;
    } else if (style === 'stadium') {
      p = `Dramatic 9:16 broadcast angle of ${player} scoring a legendary winning goal in full stadium under massive floodlights, crowd celebrating with confetti, broadcast camera zoom.`;
    } else if (style === 'retro') {
      p = `90s classic Japanese arcade style eFootball match reel with ${player}, pixel-neon score overlays, rapid skill dribble past 3 defenders, energetic celebration.`;
    } else if (style === 'champions') {
      p = `Champions League final dramatic night lighting, ${player} executing a thunderous outside-the-box volley into the net, dynamic 3D camera pan, 60fps high fidelity.`;
    } else if (style === 'sunset') {
      p = `Cinematic golden hour sunset glow over stadium, ${player} pulling off impossible rabona trivela goal, slow-motion golden lens flare, 4K HDR.`;
    } else if (style === 'anime') {
      p = `High-octane anime speedlines style eFootball mobile reel with ${player}, fiery ball trajectory, lightning impact sparks, hyper-stylized victory pose.`;
    } else if (style === 'winter') {
      p = `Freezing winter derby atmosphere, stadium steam and breath in crisp air, ${player} netting a 90th-minute header, snowy pitch details, 4K.`;
    } else if (style === 'clasico') {
      p = `El Clasico intense derby match, drone camera spiraling down as ${player} leaves defender frozen with roulette skill move and finishes bottom corner.`;
    }
    setPrompt(p);
    try { localStorage.setItem('efootball_last_prompt', p); } catch {}
    setMsg(`success: Applied ${style.toUpperCase()} style preset!`);
  }

  // 2. 1-CLICK AUTO-PILOT REEL PIPELINE
  async function autoPilotReel() {
    setGenerating(true);
    setVideoUrl('');
    setImageUrl('');
    setMsg('⚡ Auto-Pilot started: Crafting superstar prompt + viral caption…');

    try {
      const promptRes = await fetch('/api/auto-prompt', { method: 'POST' });
      const promptData = await promptRes.json();
      const chosenPrompt = promptData.prompt || prompt;
      setPrompt(chosenPrompt);
      setStarPlayerName(promptData.player || 'Superstar');

      const copyPromise = fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: copyProvider, prompt: chosenPrompt }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.text) {
            setCopy(d.text);
            try { localStorage.setItem('efootball_last_copy', d.text); } catch {}
          }
        });

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

      setVideoProgress((prev) => ({ ...prev, pct: 100, phase: '✅ Auto-Pilot Reel Complete!' }));
      setVideoUrl(finalUrl);

      try {
        localStorage.setItem('efootball_last_video_url', finalUrl);
        localStorage.setItem('efootball_last_prompt', chosenPrompt);
        localStorage.setItem('efootball_last_player', promptData.player || '');
      } catch {}

      const newItem = {
        id: 'REEL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        videoUrl: finalUrl,
        caption: copy || chosenPrompt,
        playerTag: promptData.player || 'Superstar',
        scheduledTime: new Date(Date.now() + (queuedReels.length + 1) * 45 * 60 * 1000).toISOString(),
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };
      saveQueueToStorage([newItem, ...queuedReels]);

      setMsg(`success: Auto-Pilot Reel for ${promptData.player || 'Superstar'} generated and queued!`);
    } catch (e: any) {
      setVideoProgress({ active: false, elapsed: 0, estimated: 120, pct: 0, phase: '' });
      setMsg('error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  // BATCH AUTO-QUEUE REELS
  async function batchAutoQueueReels(count = 5) {
    if (!videoUrl) {
      setMsg('error: Generate or load a real video first, then batch-queue copies at 45-minute intervals.');
      return;
    }
    setMsg(`🚀 Scheduling batch of ${count} daily superstar reels…`);
    const players = ['Lamine Yamal', 'Lionel Messi', 'Cristiano Ronaldo', 'Erling Haaland', 'Vinicius Jr', 'Jude Bellingham', 'Kylian Mbappe', 'Neymar Jr'];
    const now = Date.now();
    const newBatch = [];

    for (let i = 0; i < count; i++) {
      const p = players[i % players.length];
      newBatch.push({
        id: 'REEL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        videoUrl,
        caption: copy || `⭐ ${p} in the eFootball Community Cup! Free entry at efootball2026.online 🏆 #eFootball #eFootball2026`,
        playerTag: p,
        scheduledTime: new Date(now + (queuedReels.length + i + 1) * 45 * 60 * 1000).toISOString(),
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      });
    }

    const updated = [...newBatch, ...queuedReels];
    saveQueueToStorage(updated);
    setMsg(`success: Scheduled ${count} reels from the current video (45m intervals). Queue is saved to the API.`);
  }

  function copyCaption() {
    if (!copy) return;
    navigator.clipboard.writeText(copy);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  }

  // PUBLISH TO INSTAGRAM
  async function publishToInstagram() {
    if (!videoUrl) return;
    setIgPublishing(true);
    setIgMessage('🚀 Uploading Reel container to Instagram Graph API…');

    try {
      const r = await fetch('/api/instagram-publish', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          caption: copy || prompt,
          accessToken: igToken || undefined,
          igUserId: igUserId || undefined,
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
      setMsg('success: Added video to scheduled Instagram queue (Saved permanently)!');
    } catch (e: any) {
      setMsg('error: Failed to add to queue');
    }
  }

  async function publishQueuedItem(id: string) {
    setQueueLoading(true);
    const item = queuedReels.find((r) => r.id === id);
    if (!item) return;

    try {
      const publishingList = queuedReels.map((r) => (r.id === id ? { ...r, status: 'PUBLISHING' } : r));
      saveQueueToStorage(publishingList);

      const res = await fetch('/api/instagram-publish', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          caption: item.caption,
          accessToken: igToken || undefined,
          igUserId: igUserId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish to Instagram');

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
  }

  // STANDARD GENERATE MEDIA
  async function generateMedia() {
    setGenerating(true);
    setMsg('Initiating Alibaba Cloud Model Studio synthesis…');
    setVideoUrl('');
    setImageUrl('');

    const isVideo = provider.startsWith('wan-video');
    const model = provider === 'wan-video-plus' ? 'wan2.1-t2v-plus' : 'wan2.1-t2v-turbo';
    const estimated = model === 'wan2.1-t2v-plus' ? 180 : 120;
    let timerInterval: any = null;
    let cloudStatus = 'PENDING';

    if (isVideo) {
      let seconds = 0;
      setVideoProgress({
        active: true,
        elapsed: 0,
        estimated,
        pct: 5,
        phase: '⏳ Allocating high-compute worker node on Alibaba Cloud…',
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
            throw new Error(pollData.error || 'Alibaba Wan 2.1 video generation failed');
          }
        }

        if (timerInterval) clearInterval(timerInterval);
        if (!finalUrl) throw new Error('Video generation took longer than expected.');

        setVideoProgress((prev) => ({
          ...prev,
          pct: 100,
          phase: '✅ AI Video Synthesis Complete!',
        }));

        setVideoUrl(finalUrl);
        try {
          localStorage.setItem('efootball_last_video_url', finalUrl);
          localStorage.setItem('efootball_last_prompt', prompt);
        } catch {}
        setMsg('success: Alibaba Wan 2.1 AI Video generated successfully!');
      } else {
        const r = await fetch('/api/generate-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider, aspectRatio }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Image generation failed');
        setImageUrl(d.url || d.media?.url);
        setMsg('success: Alibaba Wan 2.1 Image generated successfully!');
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
    setMsg('Drafting viral Instagram copy with Alibaba Qwen Plus…');
    try {
      const r = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: copyProvider }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Copy generation failed');
      setCopy(d.text);
      try { localStorage.setItem('efootball_last_copy', d.text); } catch {}
      setMsg('success: Viral Instagram Reel copy generated!');
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  // TOURNAMENT OPERATIONS
  async function load() {
    setLoading(true);
    try {
      const data = await api('/api/tournaments');
      setTournaments(data);
      if (data.length && !selected) {
        setSelected(data[0].id);
      }
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const t = await api('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prize_pool: prizePool }),
      });
      setName('');
      setMsg('success: Tournament created: ' + t.id);
      await load();
      setSelected(t.id);
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function action(path: string, body?: any) {
    setLoading(true);
    try {
      await api(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      setMsg('success: Action completed');
      await load();
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

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

  async function savePrizePool() {
    if (!selected || !prizePool.trim()) return;
    setLoading(true);
    try {
      await api(`/api/admin/tournaments/${selected}/prize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_pool: prizePool }),
      });
      setMsg('success: Prize / entry label updated');
      await load();
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function kickPlayer(pid: string, displayName: string) {
    if (!selected) return;
    if (!window.confirm(`Remove ${displayName} from this open cup?`)) return;
    setLoading(true);
    try {
      await api(`/api/admin/tournaments/${selected}/players/${pid}/kick`, { method: 'POST' });
      setMsg(`success: Removed ${displayName}`);
      await load();
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadArenaMatches(tid: string) {
    try {
      const data = await api(`/api/tournaments/${tid}/matches`);
      setArenaMatches(Array.isArray(data) ? data : []);
      const ready = (data || []).find((m: any) => m.status === 'READY' || m.status === 'UNDER_REVIEW');
      if (ready) setReportMatchId(ready.id);
    } catch {
      setArenaMatches([]);
    }
  }

  // SUBMIT MATCH SCORE
  async function submitScore() {
    if (!reportMatchId) {
      setMsg('error: Select a live match first');
      return;
    }
    setLoading(true);
    try {
      await api(`/api/admin/matches/${reportMatchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score_a: scoreP1, score_b: scoreP2, note: 'admin-live-report' }),
      });
      setMsg('success: Match score recorded and bracket advanced');
      if (selected) await loadArenaMatches(selected);
      await load();
      await loadLeaderboard();
    } catch (e: any) {
      setMsg('error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // LEADERBOARD
  async function loadLeaderboard() {
    try {
      const res = await api('/api/leaderboard');
      if (Array.isArray(res)) setLeaderboardRows(res);
    } catch {}
  }

  async function addManualPlayer() {
    if (!newPlayerName.trim()) return;
    const selectedCup = tournaments.find((t) => t.id === selected);
    try {
      await api('/api/admin/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: newPlayerName.trim(),
          efootball_username: (newPlayerId || newPlayerName).trim(),
          tournament_id: selectedCup?.status === 'OPEN' ? selectedCup.id : undefined,
        }),
      });
      setNewPlayerName('');
      setNewPlayerId('');
      await loadLeaderboard();
      await load();
      setMsg('success: Athlete saved to the engine roster.');
    } catch (e: any) {
      setMsg('error: ' + (e.message || 'Could not add athlete'));
    }
  }

  async function editAthletePoints(player: any) {
    const raw = window.prompt(`Set points for ${player.display_name}:`, String(player.points ?? 0));
    if (raw === null) return;
    const points = Number(raw);
    if (!Number.isFinite(points) || points < 0) {
      setMsg('error: Points must be a number 0 or greater');
      return;
    }
    try {
      await api(`/api/admin/athletes/${player.id}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: Math.floor(points) }),
      });
      await loadLeaderboard();
      setMsg(`success: Updated ${player.display_name} to ${Math.floor(points)} pts`);
    } catch (e: any) {
      setMsg('error: ' + (e.message || 'Could not update points'));
    }
  }

  async function loadPending() {
    try {
      const d = await api('/api/admin/submissions');
      setPendingSubs(Array.isArray(d) ? d : d.submissions || []);
    } catch {
      setPendingSubs([]);
    }
  }

  async function loadDisputes() {
    try {
      const d = await api('/api/admin/disputes');
      setDisputes(Array.isArray(d) ? d : d.disputes || []);
    } catch {
      setDisputes([]);
    }
  }

  async function confirmSubmission(id: string) {
    try {
      await api(`/api/admin/submissions/${id}/confirm`, { method: 'POST' });
      await loadPending();
      await load();
      if (selected) await loadArenaMatches(selected);
      await loadLeaderboard();
      setMsg('success: Submission confirmed and bracket advanced.');
    } catch (e: any) {
      setMsg('error: ' + (e.message || 'Confirm failed'));
    }
  }

  async function resolveDispute(id: string) {
    try {
      await api(`/api/admin/disputes/${id}/resolve`, { method: 'POST' });
      await loadDisputes();
      setMsg('success: Dispute marked resolved.');
    } catch (e: any) {
      setMsg('error: ' + (e.message || 'Resolve failed'));
    }
  }

  async function forfeitPlayer(matchId: string, playerId: string, label: string) {
    if (!playerId) return;
    if (!window.confirm(`Forfeit ${label} on this fixture?`)) return;
    try {
      await api(`/api/admin/matches/${matchId}/forfeit/${playerId}`, { method: 'POST' });
      if (selected) await loadArenaMatches(selected);
      await load();
      await loadLeaderboard();
      setMsg(`success: Forfeit recorded for ${label}`);
    } catch (e: any) {
      setMsg('error: ' + (e.message || 'Forfeit failed'));
    }
  }

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

  // HEALTH PING
  async function checkHealth(opts?: { quiet?: boolean }) {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/admin/ping', { credentials: 'include' });
      const data = await res.json();
      setHealthStatus(data);
      if (!opts?.quiet) setMsg('success: Cloud services ping verified!');
    } catch (e: any) {
      if (!opts?.quiet) setMsg('error: Failed to ping cloud services');
    } finally {
      setHealthLoading(false);
    }
  }

  async function connectInstagram() {
    setIgConnecting(true);
    setIgMessage('Checking Meta token health…');
    try {
      const health = igToken
        ? await localApi('/api/admin/instagram-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: igToken, igUserId }),
          })
        : await localApi('/api/admin/instagram-status');
      setIgHealth(health);
      if (health?.instagramAccount?.id) {
        setIgUserId(health.instagramAccount.id);
        try {
          localStorage.setItem('efootball_ig_user_id', health.instagramAccount.id);
        } catch {}
      }
      if (health?.valid) {
        const handle = health.instagramAccount?.username ? `@${health.instagramAccount.username}` : 'Instagram';
        setIgMessage(`✅ Connected ${handle}. Token source: ${health.source}.`);
        setMsg(`success: Instagram connected (${handle})`);
      } else {
        setIgMessage('⚠️ ' + (health?.error || 'Token is not valid'));
      }
    } catch (e: any) {
      setIgMessage('⚠️ ' + e.message);
    } finally {
      setIgConnecting(false);
    }
  }

  // SITE ANNOUNCEMENT
  async function saveAnnouncement() {
    try {
      const data = await localApi('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: announcementActive, message: announcementText }),
      });
      if (data.success) {
        setMsg(data.persisted ? 'success: Site-wide broadcast saved' : 'success: Broadcast saved locally (API offline)');
      }
    } catch (e: any) {
      setMsg('error: Failed to update announcement');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([load(), loadLeaderboard(), checkHealth({ quiet: true }), connectInstagram(), loadPending(), loadDisputes()]);
      if (cancelled) return;
      try {
        const q = await localApi('/api/reels-queue');
        if (Array.isArray(q.queue) && q.queue.length) saveQueueLocal(q.queue);
      } catch {}
      try {
        const a = await fetch('/api/admin/announcement').then((r) => r.json());
        if (!cancelled && a && typeof a.active === 'boolean') {
          setAnnouncementActive(a.active);
          if (typeof a.message === 'string') setAnnouncementText(a.message);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) loadArenaMatches(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Keyboard shortcuts: 1-4 jump between tabs, R refreshes. Ignored while the
  // organizer is typing so they never fight a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      const map: Record<string, typeof activeTab> = {
        '1': 'reels',
        '2': 'tournaments',
        '3': 'leaderboard',
        '4': 'broadcast',
      };
      if (map[e.key]) {
        setActiveTab(map[e.key]);
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        load();
        loadLeaderboard();
        loadPending();
        loadDisputes();
        setLastSync(new Date());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the moderation queue so submissions and disputes surface without a
  // manual refresh. Pauses while the tab is hidden to avoid pointless calls.
  useEffect(() => {
    if (!autoRefresh) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      loadPending();
      loadDisputes();
      setLastSync(new Date());
    };
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  useEffect(() => {
    const t = tournaments.find((x) => x.id === selected);
    if (t?.prize_pool) setPrizePool(t.prize_pool);
  }, [selected, tournaments]);

  const selectedTournament = tournaments.find((t) => t.id === selected);
  const reportMatch = arenaMatches.find((m) => m.id === reportMatchId);

  // At-a-glance operational metrics for the KPI strip.
  const kpis = useMemo(() => {
    const totalPlayers = tournaments.reduce((sum, t) => sum + (t.players?.length || 0), 0);
    const openCups = tournaments.filter((t) => (t.status || '').toUpperCase() === 'OPEN').length;
    const liveCups = tournaments.filter((t) =>
      ['LOCKED', 'IN_PROGRESS', 'FULL'].includes((t.status || '').toUpperCase())
    ).length;
    const queued = queuedReels.filter((r) => r.status === 'QUEUED').length;
    const published = queuedReels.filter((r) => r.status === 'PUBLISHED').length;
    const services = healthStatus?.services || {};
    const degraded = Object.values(services).filter(
      (s: any) => s?.status && !['ONLINE', 'CONFIGURED'].includes(s.status)
    ).length;
    return {
      cups: tournaments.length,
      openCups,
      liveCups,
      totalPlayers,
      pending: pendingSubs.length,
      disputes: disputes.length,
      queued,
      published,
      degraded,
    };
  }, [tournaments, pendingSubs, disputes, queuedReels, healthStatus]);

  // Anything needing organizer attention right now.
  const actionCount = kpis.pending + kpis.disputes;

  return (
    <div className="matchday-shell" style={{ background: '#020626', minHeight: '100vh', color: '#fff' }}>
      {/* 1. TOP TICKER */}
      <header className="konami-top-header">
        <div className="konami-top-inner">
          <a className="konami-red-logo" href="/" target="_blank" rel="noreferrer">
            KONAMI
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', background: 'var(--konami-yellow)', color: '#000', fontWeight: 900, padding: '2px 8px', borderRadius: '4px' }}>
              COMMAND HUB
            </span>
            <span style={{ fontSize: '11px', color: '#88a0ff' }}>eFootball™ Community Organizer Suite</span>
          </div>
        </div>
      </header>

      {/* 2. HEADER */}
      <div className="konami-main-header">
        <a className="konami-header-logo" href="/">
          <div className="konami-header-emblem">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 14c17.1 0 31 13.9 31 31H19c0-17.1 13.9-31 31-31zm0 62c-17.1 0-31-13.9-31-31h62c0 17.1-13.9 31-31 31z"/>
            </svg>
          </div>
          <span className="konami-header-title">
            FOOTBALL<span>™ COMMAND HUB</span>
          </span>
        </a>

        <nav className="konami-nav-pills">
          <a className="pill-btn" href="/">PUBLIC HOME ↗</a>
          <a className="pill-btn" href="/#tournaments">CUPS</a>
          <a className="pill-btn" href="/#reels">REELS</a>
          <a className="pill-btn home" href="/admin">COMMAND CENTER</a>
        </nav>
      </div>

      <main className="main-content-flow" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        {/* TITLE STAGE */}
        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <span style={{ color: 'var(--konami-yellow)', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 800, letterSpacing: '1px' }}>
              ESPORTS ORGANIZER & AI STUDIO
            </span>
            <h1 style={{ fontSize: '38px', margin: '6px 0', fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase' }}>
              eFootball™ <em>Master Suite.</em>
            </h1>
            <p style={{ color: '#88a0ff', margin: 0, fontSize: '14px' }}>
              Full administrative authority over tournaments, real-player AI reels, athlete standings, prize pools, and live broadcasting.
              <br />
              <span style={{ fontSize: '12px', color: '#5f74b8' }}>
                Shortcuts: press <kbd>1</kbd>–<kbd>4</kbd> to switch tabs, <kbd>R</kbd> to refresh.
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {lastSync && (
              <span style={{ fontSize: '11px', color: '#7890d6', fontFamily: 'var(--font-mono)' }}>
                Synced {lastSync.toLocaleTimeString()}
              </span>
            )}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#c9d6ff',
                cursor: 'pointer',
                background: '#081766',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '8px 12px',
                borderRadius: '6px',
              }}
            >
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-refresh 30s
            </label>
            <button
              onClick={() => {
                load();
                loadLeaderboard();
                checkHealth();
                loadPending();
                loadDisputes();
                setLastSync(new Date());
              }}
              style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
            >
              ↻ Refresh All Data
            </button>
          </div>
        </div>

        {/* OPERATIONAL KPI STRIP */}
        <div className="kpi-strip">
          <div className="kpi-card">
            <b>{kpis.cups}</b>
            <span>Total cups</span>
          </div>
          <div className="kpi-card">
            <b>{kpis.openCups}</b>
            <span>Open for entry</span>
          </div>
          <div className="kpi-card">
            <b>{kpis.liveCups}</b>
            <span>In progress</span>
          </div>
          <div className="kpi-card">
            <b>{kpis.totalPlayers}</b>
            <span>Players registered</span>
          </div>
          <div className={`kpi-card${kpis.pending ? ' alert' : ''}`}>
            <b>{kpis.pending}</b>
            <span>Pending review</span>
          </div>
          <div className={`kpi-card${kpis.disputes ? ' danger' : ''}`}>
            <b>{kpis.disputes}</b>
            <span>Open disputes</span>
          </div>
          <div className="kpi-card">
            <b>{kpis.queued}</b>
            <span>Reels queued</span>
          </div>
          <div className={`kpi-card${kpis.degraded ? ' alert' : ''}`}>
            <b>{kpis.degraded}</b>
            <span>Services degraded</span>
          </div>
        </div>

        {/* ACTION REQUIRED CALLOUT */}
        {actionCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '13px 17px',
              marginBottom: '22px',
              borderRadius: '9px',
              background: 'rgba(255,170,0,0.12)',
              border: '1px solid rgba(255,170,0,0.55)',
            }}
            role="status"
          >
            <span aria-hidden="true" style={{ fontSize: '18px' }}>
              🔔
            </span>
            <strong style={{ fontSize: '14px', color: '#ffc94d' }}>
              {actionCount} item{actionCount === 1 ? '' : 's'} need your attention
            </strong>
            <span style={{ fontSize: '13px', color: '#c9d6ff' }}>
              {kpis.pending} pending submission{kpis.pending === 1 ? '' : 's'} · {kpis.disputes} open dispute
              {kpis.disputes === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => {
                setActiveTab('tournaments');
                loadPending();
                loadDisputes();
              }}
              style={{
                marginLeft: 'auto',
                background: 'var(--konami-yellow)',
                color: '#000',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '6px',
                fontWeight: 900,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Review now ↗
            </button>
          </div>
        )}

        {/* 4 MASTER ADMIN TABS */}
        <div
          role="tablist"
          aria-label="Admin sections"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            marginBottom: '30px',
            background: 'rgba(3, 10, 56, 0.95)',
            padding: '10px',
            borderRadius: '12px',
            border: '2px solid rgba(255, 255, 0, 0.4)',
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'reels'}
            onClick={() => setActiveTab('reels')}
            style={{
              padding: '14px 18px',
              background: activeTab === 'reels' ? 'var(--konami-yellow)' : '#081766',
              color: activeTab === 'reels' ? '#000' : '#fff',
              border: activeTab === 'reels' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'reels' ? '0 0 15px rgba(255,255,0,0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            🎬 AI REELS & AUTO-PILOT STUDIO
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'tournaments'}
            onClick={() => { setActiveTab('tournaments'); loadPending(); loadDisputes(); }}
            style={{
              padding: '14px 18px',
              background: activeTab === 'tournaments' ? 'var(--konami-yellow)' : '#081766',
              color: activeTab === 'tournaments' ? '#000' : '#fff',
              border: activeTab === 'tournaments' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'tournaments' ? '0 0 15px rgba(255,255,0,0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            🏆 TOURNAMENTS & BRACKETS ({tournaments.length})
            {actionCount > 0 && (
              <span className="tab-badge" title={`${actionCount} items need attention`}>
                {actionCount}
              </span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'leaderboard'}
            onClick={() => { setActiveTab('leaderboard'); loadLeaderboard(); }}
            style={{
              padding: '14px 18px',
              background: activeTab === 'leaderboard' ? 'var(--konami-yellow)' : '#081766',
              color: activeTab === 'leaderboard' ? '#000' : '#fff',
              border: activeTab === 'leaderboard' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'leaderboard' ? '0 0 15px rgba(255,255,0,0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            👑 LEADERBOARDS & ATHLETES
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'broadcast'}
            onClick={() => { setActiveTab('broadcast'); checkHealth(); }}
            style={{
              padding: '14px 18px',
              background: activeTab === 'broadcast' ? 'var(--konami-yellow)' : '#081766',
              color: activeTab === 'broadcast' ? '#000' : '#fff',
              border: activeTab === 'broadcast' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'broadcast' ? '0 0 15px rgba(255,255,0,0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            📢 ALERTS & CLOUD HEALTH
          </button>
        </div>

        {/* NOTIFICATION MESSAGE */}
        {msg && (
          <div
            style={{
              marginBottom: '25px',
              padding: '14px 18px',
              borderRadius: '8px',
              background: msg.startsWith('success') ? 'rgba(0,255,100,0.15)' : 'rgba(255,0,0,0.25)',
              border: '1px solid ' + (msg.startsWith('success') ? '#00ff66' : '#ff4444'),
              color: '#fff',
              fontWeight: 800,
              fontSize: '14px',
            }}
          >
            {msg}
          </div>
        )}

        {/* TAB 1: AI REELS & AUTO-PILOT STUDIO */}
        {activeTab === 'reels' && (
          <section style={{ background: '#051145', border: '2px solid var(--konami-yellow)', borderRadius: '12px', padding: '24px', marginBottom: '30px' }}>
            {/* 1-CLICK AUTO-PILOT BANNER */}
            <div
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #ff8800 100%)',
                borderRadius: '10px',
                padding: '18px 22px',
                marginBottom: '20px',
                color: '#000',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <strong style={{ fontSize: '18px', display: 'block', fontFamily: 'var(--font-display)', fontWeight: 900 }}>
                  ⚡ 1-CLICK AUTO-PILOT REEL (REAL SUPERSTARS & 4K AI)
                </strong>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  Auto-crafts superstar prompts (Yamal, Messi, CR7, Haaland) + viral captions + Wan 2.1 video + auto-queue!
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={autoPilotReel}
                  disabled={generating}
                  style={{
                    background: '#000',
                    color: '#ffd700',
                    fontWeight: 900,
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  }}
                >
                  {generating ? 'AUTO-PILOT ACTIVE…' : '⚡ 1-CLICK GENERATE REEL ↗'}
                </button>
                <button
                  onClick={() => batchAutoQueueReels(5)}
                  disabled={generating}
                  style={{
                    background: '#000be0',
                    color: '#fff',
                    fontWeight: 900,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  📅 BATCH QUEUE 5 REELS
                </button>
                <button
                  onClick={() => batchAutoQueueReels(10)}
                  disabled={generating}
                  style={{
                    background: '#081766',
                    color: '#ffd700',
                    fontWeight: 900,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid #ffd700',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  📅 BATCH 10 REELS
                </button>
              </div>
            </div>

            {/* 8 VIRAL STYLE PRESETS */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                🎨 8 VIRAL CINEMATIC STYLE PRESETS:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button onClick={() => applyStylePreset('stadium')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  🏟️ 4K Stadium Floodlights
                </button>
                <button onClick={() => applyStylePreset('neon')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  ⚡ Cyberpunk Neon Trail
                </button>
                <button onClick={() => applyStylePreset('champions')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  🔥 Champions League Volley
                </button>
                <button onClick={() => applyStylePreset('retro')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  📺 90s Retro Arcade CRT
                </button>
                <button onClick={() => applyStylePreset('sunset')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  🌅 Golden Hour Sunset
                </button>
                <button onClick={() => applyStylePreset('anime')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  ⚡ Anime Speedlines
                </button>
                <button onClick={() => applyStylePreset('winter')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  ❄️ Cold Winter Derby
                </button>
                <button onClick={() => applyStylePreset('clasico')} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  🚁 El Clásico Drone Cam
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>AI ENGINE / MODEL</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="wan-video-turbo">Alibaba Wan 2.1 Video Turbo (Fastest ~60s)</option>
                    <option value="wan-video-plus">Alibaba Wan 2.1 Video Plus (Ultra 4K Fidelity)</option>
                    <option value="wan-image">Alibaba Wan 2.1 Image (Tournament Poster)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, margin: 0 }}>CINEMATIC PROMPT</label>
                    <button
                      type="button"
                      onClick={autoCraftPrompt}
                      style={{ background: 'transparent', border: 'none', color: 'var(--konami-yellow)', cursor: 'pointer', fontSize: '12px', fontWeight: 800, textDecoration: 'underline' }}
                    >
                      🎲 Re-Roll Superstar (Yamal, Messi, CR7) ↗
                    </button>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    placeholder="Describe football highlight or promotional clip..."
                    style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>ASPECT RATIO</label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="9:16">9:16 Vertical (Reels/TikTok)</option>
                      <option value="16:9">16:9 Landscape (YouTube)</option>
                      <option value="1:1">1:1 Square (Feed Post)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>AUDIO / SFX TRACK</label>
                    <select
                      value={audioPreset}
                      onChange={(e) => setAudioPreset(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                    >
                      <option value="stadium-roar">🏟️ Stadium Crowd Roar</option>
                      <option value="ucl-anthem">🏆 Champions League Vibe</option>
                      <option value="cyber-trap">⚡ Cyber Trap Beat</option>
                      <option value="phonk-drill">🔥 High Energy Phonk Drill</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={generateMedia}
                  disabled={generating || prompt.trim().length < 5}
                  style={{ width: '100%', background: 'var(--konami-yellow)', color: '#000', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 900, fontSize: '14px', cursor: 'pointer' }}
                >
                  {generating ? 'SYNTHESIZING MEDIA…' : 'GENERATE AI VIDEO / MEDIA ↗'}
                </button>
              </div>

              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>VIRAL CAPTION ENGINE</label>
                  <select
                    value={copyProvider}
                    onChange={(e) => setCopyProvider(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="qwen">Alibaba Qwen Plus · Model Studio</option>
                    <option value="openrouter">OpenRouter · Llama 3.3 70B</option>
                    <option value="groq">Groq · Llama 3.3</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, display: 'block', marginBottom: '6px' }}>BRANDING & WATERMARK</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="@efootball2026.online"
                      style={{ flex: 1, padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowWatermark(!showWatermark)}
                      style={{ background: showWatermark ? '#00cc66' : '#444', color: showWatermark ? '#000' : '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {showWatermark ? 'ON ✓' : 'OFF ✕'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={generateCopy}
                  disabled={generating}
                  style={{ width: '100%', background: '#081766', color: '#fff', border: '1px solid #88a0ff', padding: '12px', borderRadius: '6px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', marginBottom: '14px' }}
                >
                  Generate Viral Instagram Caption ↗
                </button>

                {copy && (
                  <div style={{ background: '#030a38', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--konami-yellow)' }}>Instagram Caption:</strong>
                      <button
                        onClick={copyCaption}
                        style={{ background: copyFeedback ? '#00ff66' : 'var(--konami-yellow)', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        {copyFeedback ? 'COPIED! ✓' : 'COPY 📋'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ddd', whiteSpace: 'pre-wrap' }}>{copy}</p>
                  </div>
                )}
              </div>
            </div>

            {/* REAL-TIME VIDEO PROGRESS TRACKER */}
            {videoProgress.active && (
              <div style={{ marginTop: '20px', background: '#030a38', border: '1px solid #88a0ff', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>⚡ AI Video Synthesis in Progress</span>
                  <span style={{ fontSize: '12px', color: 'var(--konami-yellow)', fontFamily: 'var(--font-mono)' }}>
                    ⏱️ {videoProgress.elapsed}s / ~{videoProgress.estimated}s ({Math.max(0, videoProgress.estimated - videoProgress.elapsed)}s remaining)
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ height: '100%', width: `${videoProgress.pct}%`, background: 'linear-gradient(90deg, #ffd700, #00ff66)', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#88a0ff' }}>
                  <span>{videoProgress.phase}</span>
                  <strong>{videoProgress.pct}%</strong>
                </div>
              </div>
            )}

            {/* VIDEO PLAYER & INSTAGRAM PUBLISHER */}
            {videoUrl && (
              <div style={{ marginTop: '24px', background: '#030a38', border: '1px solid var(--konami-yellow)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'center', background: '#000', padding: '10px', position: 'relative' }}>
                  <video src={videoUrl} controls autoPlay loop style={{ maxHeight: '420px', borderRadius: '6px' }} />
                  {showWatermark && (
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(0,0,0,0.7)', color: 'var(--konami-yellow)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                      {watermarkText}
                    </div>
                  )}
                </div>
                <div style={{ padding: '18px', background: '#081766' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    <a href={videoUrl} target="_blank" rel="noreferrer" style={{ background: 'var(--konami-yellow)', color: '#000', padding: '10px', textAlign: 'center', borderRadius: '6px', fontWeight: 900, textDecoration: 'none', fontSize: '13px' }}>
                      ⬇️ DOWNLOAD MP4
                    </a>
                    <button onClick={copyCaption} style={{ background: '#030a38', color: '#fff', border: '1px solid #88a0ff', padding: '10px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>
                      {copyFeedback ? 'COPIED! ✓' : '📋 COPY CAPTION'}
                    </button>
                    <button onClick={addToSchedule} style={{ background: '#00cc66', color: '#000', padding: '10px', borderRadius: '6px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                      📅 ADD TO QUEUE ↗
                    </button>
                  </div>

                  {/* INSTAGRAM AUTO-PUBLISHER */}
                  <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '14px' }}>📲 META INSTAGRAM PUBLISHER</strong>
                        <span style={{ marginLeft: '10px', background: igHealth?.valid ? '#00cc66' : '#ffaa00', color: '#000', fontSize: '11px', fontWeight: 900, padding: '2px 8px', borderRadius: '4px' }}>
                          {igHealth?.valid
                            ? `LIVE${igHealth.instagramAccount?.username ? ' @' + igHealth.instagramAccount.username : ''}`
                            : igHealth?.configured
                              ? 'TOKEN INVALID'
                              : 'ENV TOKEN NOT SET'}
                        </span>
                      </div>
                      <button onClick={() => setShowCreds(!showCreds)} style={{ background: 'transparent', border: 'none', color: '#88a0ff', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                        {showCreds ? 'Hide override ▲' : 'Optional token override ▼'}
                      </button>
                    </div>

                    <p style={{ fontSize: '12px', color: '#88a0ff', margin: '0 0 10px' }}>
                      Uses <code>INSTAGRAM_ACCESS_TOKEN</code> / <code>INSTAGRAM_ACCOUNT_ID</code> from server env. 1-click connect validates the token and resolves the professional account id.
                    </p>

                    {showCreds && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <input
                          placeholder="Instagram Account ID (optional override)"
                          value={igUserId}
                          onChange={(e) => setIgUserId(e.target.value)}
                          style={{ background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
                        />
                        <input
                          placeholder="Paste token only if not using env"
                          type="password"
                          value={igToken}
                          onChange={(e) => setIgToken(e.target.value)}
                          autoComplete="off"
                          style={{ background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', padding: '8px', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={connectInstagram}
                        disabled={igConnecting}
                        style={{ background: '#081766', color: '#fff', padding: '12px', borderRadius: '6px', fontWeight: 900, fontSize: '13px', border: '1px solid #88a0ff', cursor: 'pointer' }}
                      >
                        {igConnecting ? 'CHECKING TOKEN…' : '1-CLICK CONNECT / VALIDATE'}
                      </button>
                      <button
                        onClick={publishToInstagram}
                        disabled={igPublishing}
                        style={{ background: 'var(--konami-yellow)', color: '#000', padding: '12px', borderRadius: '6px', fontWeight: 900, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                      >
                        {igPublishing ? 'PUBLISHING TO INSTAGRAM…' : 'POST TO INSTAGRAM REELS'}
                      </button>
                    </div>

                    {igHealth?.expiresAt && (
                      <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#88a0ff' }}>
                        Token expiry: {new Date(igHealth.expiresAt).toLocaleString()}
                      </p>
                    )}

                    {igMessage && (
                      <p style={{ margin: '10px 0 0', fontSize: '13px', color: igMessage.startsWith('✅') ? '#00ff66' : 'var(--konami-yellow)', fontWeight: 800 }}>
                        {igMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SCHEDULED REELS VAULT */}
            <div style={{ marginTop: '24px', background: '#030a38', border: '1px solid var(--konami-yellow)', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ color: 'var(--konami-yellow)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px' }}>
                    📅 SCHEDULED REELS VAULT ({queuedReels.length} Videos Saved)
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#88a0ff' }}>
                    Saved permanently across browser refreshes. Click &quot;▶ Load in Player&quot; to preview or publish anytime!
                  </p>
                </div>
                <button
                  onClick={() => batchAutoQueueReels(10)}
                  style={{ background: '#000be0', color: '#fff', border: '1px solid var(--konami-yellow)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  + Auto-Queue 10 Reels
                </button>
              </div>

              {queuedReels.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {queuedReels.map((item) => (
                    <div key={item.id} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '14px' }}>⭐ {item.playerTag} Reel</strong>
                        <span style={{ marginLeft: '12px', fontSize: '12px', color: '#88a0ff' }}>
                          Slot: {new Date(item.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ marginLeft: '12px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: item.status === 'PUBLISHED' ? '#00cc66' : '#081766', color: item.status === 'PUBLISHED' ? '#000' : '#fff', fontWeight: 800 }}>
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
                            setMsg(`success: Loaded ${item.playerTag} video into player!`);
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
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#88a0ff', fontSize: '13px' }}>
                  No reels currently queued. Generate a video above or click Auto-Pilot!
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: TOURNAMENTS & BRACKETS */}
        {activeTab === 'tournaments' && (
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {/* CREATE CARD */}
              <div style={{ background: '#051145', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px' }}>
                <span style={{ fontSize: '11px', color: '#88a0ff', fontWeight: 800 }}>OPERATION 01</span>
                <h2 style={{ fontSize: '26px', margin: '6px 0 14px', fontFamily: 'var(--font-display)', fontWeight: 900 }}>Create Tournament.</h2>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#88a0ff', display: 'block', marginBottom: '6px', fontWeight: 800 }}>TOURNAMENT NAME</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Weekend Champions Cup #1"
                    style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#88a0ff', display: 'block', marginBottom: '6px', fontWeight: 800 }}>PRIZE POOL / ENTRY</label>
                  <input
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="e.g. ₹5,000 / $60 Prize Pool"
                    style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <button
                  onClick={create}
                  disabled={name.trim().length < 2 || loading}
                  style={{ width: '100%', background: 'var(--konami-yellow)', color: '#000', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
                >
                  Create New Cup ↗
                </button>
                <button
                  onClick={savePrizePool}
                  disabled={!selected || loading}
                  style={{ width: '100%', marginTop: '8px', background: '#081766', color: '#fff', padding: '10px', border: '1px solid #88a0ff', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
                >
                  Save prize / entry label on selected cup
                </button>
              </div>

              {/* ACTIVE CUPS */}
              <div style={{ background: '#051145', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#88a0ff', fontWeight: 800 }}>OPERATION 02</span>
                  <button onClick={load} style={{ background: 'transparent', border: 'none', color: 'var(--konami-yellow)', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>
                    ↻ Refresh
                  </button>
                </div>
                <h2 style={{ fontSize: '26px', margin: '0 0 14px', fontFamily: 'var(--font-display)', fontWeight: 900 }}>Active Cups ({tournaments.length})</h2>
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                  {tournaments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: selected === t.id ? '#081766' : '#030a38',
                        border: selected === t.id ? '2px solid var(--konami-yellow)' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px' }}>{t.name}</strong>
                        <small style={{ color: '#88a0ff', fontSize: '11px' }}>{t.id} · {t.status}</small>
                      </div>
                      <b style={{ color: 'var(--konami-yellow)', fontSize: '14px' }}>{t.players.length}/8</b>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SELECTED ARENA */}
            {selectedTournament && (
              <div style={{ background: '#051145', border: '2px solid var(--konami-yellow)', borderRadius: '12px', padding: '24px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--konami-yellow)', fontWeight: 800 }}>SELECTED ARENA / {selectedTournament.id}</span>
                    <h2 style={{ fontSize: '32px', margin: '4px 0', fontFamily: 'var(--font-display)', fontWeight: 900 }}>{selectedTournament.name}</h2>
                    <a href={`/tournaments/${selectedTournament.id}`} target="_blank" rel="noreferrer" style={{ color: '#88a0ff', fontSize: '13px', textDecoration: 'underline' }}>
                      /tournaments/{selectedTournament.id} ↗
                    </a>
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#88a0ff' }}>
                      Prize / entry: <strong style={{ color: '#fff' }}>{selectedTournament.prize_pool || 'Free entry · Community cup'}</strong>
                      {selectedTournament.efootball_id ? (
                        <> · Room code: <strong style={{ color: 'var(--konami-yellow)' }}>{selectedTournament.efootball_id}</strong></>
                      ) : (
                        ' · Room code not set'
                      )}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      background: selectedTournament.status === 'LIVE' || selectedTournament.status === 'IN_PROGRESS' ? '#00cc66' : selectedTournament.status === 'OPEN' ? 'var(--konami-yellow)' : '#88a0ff',
                      color: '#000',
                      fontWeight: 900,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}>
                      {selectedTournament.status}
                    </span>
                    <strong style={{ display: 'block', fontSize: '32px', color: 'var(--konami-yellow)', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>
                      {selectedTournament.players.length}/8
                    </strong>
                  </div>
                </div>

                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
                  <div style={{ height: '100%', width: `${(selectedTournament.players.length / 8) * 100}%`, background: 'var(--konami-yellow)' }} />
                </div>

                {/* ROSTER */}
                <span style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800, display: 'block', marginBottom: '10px' }}>REGISTERED ROSTER</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '20px' }}>
                  {selectedTournament.players.map((p: any, i: number) => (
                    <div key={p.id || i} style={{ background: '#030a38', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 800, display: 'block' }}>#{i + 1} {p.display_name}</span>
                        <small style={{ color: '#88a0ff' }}>@{p.efootball_username}</small>
                      </div>
                      <button
                        onClick={() => kickPlayer(p.id, p.display_name)}
                        style={{ background: 'rgba(255,0,0,0.2)', border: '1px solid #ff4444', color: '#ff6666', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                      >
                        Kick
                      </button>
                    </div>
                  ))}
                  {!selectedTournament.players.length && (
                    <div style={{ color: '#88a0ff', fontSize: '13px' }}>Waiting for players to join via public link.</div>
                  )}
                </div>

                {/* TOURNAMENT MASTER CONTROLS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
                  <div style={{ background: '#030a38', padding: '16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800 }}>STEP 1: BRACKET ENGINE</span>
                    <p style={{ margin: '4px 0 10px', fontSize: '12px', color: '#aaa' }}>Generate 8-player single elimination bracket.</p>
                    <button
                      disabled={selectedTournament.players.length !== 8 || !!selectedTournament.bracket_generated}
                      onClick={() => action(`/api/admin/tournaments/${selectedTournament.id}/bracket`)}
                      style={{ width: '100%', background: 'var(--konami-yellow)', color: '#000', padding: '10px', borderRadius: '6px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '13px' }}
                    >
                      {selectedTournament.bracket_generated ? 'BRACKET GENERATED ✓' : 'GENERATE 8-PLAYER BRACKET ↗'}
                    </button>
                  </div>

                  <div style={{ background: '#030a38', padding: '16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800 }}>STEP 2: KONAMI ROOM CODE</span>
                    <p style={{ margin: '4px 0 10px', fontSize: '12px', color: '#aaa' }}>Generate or enter in-game room passcode.</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="e.g. 0004-6470-6202"
                        style={{ flex: 1, padding: '8px 12px', background: '#01041b', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                      />
                      <button onClick={generateAutoRoomCode} type="button" style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>
                        🎲 Auto
                      </button>
                      <button
                        disabled={!code.trim()}
                        onClick={() => action(`/api/admin/tournaments/${selectedTournament.id}/efootball-id`, { tournament_id: code })}
                        style={{ background: 'var(--konami-yellow)', color: '#000', padding: '8px 14px', border: 'none', borderRadius: '6px', fontWeight: 900, cursor: 'pointer', fontSize: '12px' }}
                      >
                        Activate
                      </button>
                    </div>
                  </div>

                  {/* MATCH SCORE REPORTER */}
                  <div style={{ background: '#030a38', padding: '16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800 }}>STEP 3: LIVE MATCH SCORE REPORTER</span>
                    <p style={{ margin: '4px 0 10px', fontSize: '12px', color: '#aaa' }}>Writes confirmed scores to the bracket API (no draws).</p>
                    <select
                      value={reportMatchId}
                      onChange={(e) => setReportMatchId(e.target.value)}
                      style={{ width: '100%', marginBottom: '8px', padding: '8px', background: '#01041b', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
                    >
                      <option value="">Select fixture</option>
                      {arenaMatches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.round} {m.slot}: {m.player_a_name || m.player_a || 'TBD'} vs {m.player_b_name || m.player_b || 'TBD'} ({m.status})
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        value={scoreP1}
                        onChange={(e) => setScoreP1(Number(e.target.value))}
                        style={{ width: '45px', padding: '6px', background: '#01041b', border: '1px solid #88a0ff', color: '#fff', borderRadius: '4px', textAlign: 'center', fontWeight: 900 }}
                      />
                      <span style={{ color: '#88a0ff', fontWeight: 900 }}>VS</span>
                      <input
                        type="number"
                        value={scoreP2}
                        onChange={(e) => setScoreP2(Number(e.target.value))}
                        style={{ width: '45px', padding: '6px', background: '#01041b', border: '1px solid #88a0ff', color: '#fff', borderRadius: '4px', textAlign: 'center', fontWeight: 900 }}
                      />
                      <button
                        onClick={submitScore}
                        disabled={!reportMatchId || loading}
                        style={{ flex: 1, background: '#00cc66', color: '#000', padding: '8px 12px', borderRadius: '6px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Record Score ⚽
                      </button>
                    </div>
                    {reportMatch && (reportMatch.player_a || reportMatch.player_b) && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={!reportMatch.player_a}
                          onClick={() => forfeitPlayer(reportMatch.id, reportMatch.player_a, reportMatch.player_a_name || 'Player A')}
                          style={{ flex: 1, background: 'rgba(255,0,0,0.15)', color: '#ff8888', border: '1px solid #ff4444', padding: '8px', borderRadius: '6px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                        >
                          Forfeit {reportMatch.player_a_name || 'A'}
                        </button>
                        <button
                          type="button"
                          disabled={!reportMatch.player_b}
                          onClick={() => forfeitPlayer(reportMatch.id, reportMatch.player_b, reportMatch.player_b_name || 'Player B')}
                          style={{ flex: 1, background: 'rgba(255,0,0,0.15)', color: '#ff8888', border: '1px solid #ff4444', padding: '8px', borderRadius: '6px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                        >
                          Forfeit {reportMatch.player_b_name || 'B'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#051145', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#88a0ff', fontWeight: 800 }}>MATCH EVIDENCE / SCORING</span>
                  <button onClick={loadPending} style={{ background: 'transparent', border: 'none', color: 'var(--konami-yellow)', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>↻ Refresh</button>
                </div>
                <h2 style={{ fontSize: '22px', margin: '0 0 12px', fontFamily: 'var(--font-display)', fontWeight: 900 }}>Pending submissions ({pendingSubs.length})</h2>
                {pendingSubs.length ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {pendingSubs.map((s) => (
                      <div key={s.id} style={{ background: '#030a38', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                          <strong style={{ color: '#fff', fontSize: '13px' }}>{s.player_name || s.player_id}</strong>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 900, color: 'var(--konami-yellow)', fontVariantNumeric: 'tabular-nums' }}>
                            {s.score_a}–{s.score_b}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 8px', fontSize: '12px', color: '#88a0ff' }}>
                          {s.match_id || s.tournament_id}
                          {s.created_at ? ` · ${new Date(s.created_at).toLocaleString()}` : ''}
                        </p>

                        {/* Inline evidence preview so the organizer can verify
                            without opening a new tab for every submission. */}
                        {s.evidence_url ? (
                          <a
                            href={s.evidence_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'block', textDecoration: 'none' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={s.evidence_url}
                              alt={`Match evidence submitted by ${s.player_name || s.player_id}`}
                              loading="lazy"
                              style={{
                                width: '100%',
                                maxHeight: '150px',
                                objectFit: 'cover',
                                borderRadius: '5px',
                                border: '1px solid rgba(255,255,0,0.35)',
                                background: '#01041b',
                                display: 'block',
                              }}
                              onError={(e) => {
                                // Non-image evidence (or a dead link): hide the
                                // broken preview and leave the text link.
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span style={{ color: 'var(--konami-yellow)', fontSize: '12px', display: 'inline-block', marginTop: '6px' }}>
                              Open full evidence ↗
                            </span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#ffaa55' }}>⚠️ No evidence attached</span>
                        )}

                        <button
                          onClick={() => confirmSubmission(s.id)}
                          style={{ display: 'block', width: '100%', marginTop: '8px', background: '#00cc66', color: '#000', border: 'none', borderRadius: '4px', padding: '8px', fontWeight: 900, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Confirm result
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: '#88a0ff', fontSize: '13px' }}>No pending evidence. Player URL/upload submissions land here for confirm.</p>
                )}
              </div>
              <div style={{ background: '#051145', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#88a0ff', fontWeight: 800 }}>OPEN DISPUTES</span>
                  <button onClick={loadDisputes} style={{ background: 'transparent', border: 'none', color: 'var(--konami-yellow)', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>↻ Refresh</button>
                </div>
                <h2 style={{ fontSize: '22px', margin: '0 0 12px', fontFamily: 'var(--font-display)', fontWeight: 900 }}>Disputes ({disputes.length})</h2>
                {disputes.length ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {disputes.map((d) => (
                      <div key={d.id} style={{ background: '#030a38', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <strong style={{ color: '#fff', fontSize: '13px' }}>{d.id}</strong>
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#88a0ff' }}>{d.reason || 'No reason'} · match {d.match_id}</p>
                        <button
                          onClick={() => resolveDispute(d.id)}
                          style={{ width: '100%', background: '#081766', color: '#fff', border: '1px solid #88a0ff', borderRadius: '4px', padding: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Mark resolved
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: '#88a0ff', fontSize: '13px' }}>No open disputes.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <section style={{ background: '#051145', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#88a0ff', fontWeight: 800 }}>ESPORTS CIRCUIT STANDINGS</span>
                <h2 style={{ fontSize: '28px', margin: '4px 0', fontFamily: 'var(--font-display)', fontWeight: 900 }}>Athletes & Elo Database.</h2>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={loadLeaderboard} style={{ background: '#081766', color: '#fff', border: '1px solid #88a0ff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>
                  ↻ Refresh
                </button>
                <button onClick={exportCSV} style={{ background: '#00cc66', color: '#000', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 900 }}>
                  📥 Export CSV ↗
                </button>
              </div>
            </div>

            {/* MANUAL ATHLETE REGISTRATION */}
            <div style={{ background: '#030a38', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#88a0ff', fontWeight: 800 }}>➕ REGISTER ATHLETE:</span>
              <input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Athlete Display Name"
                style={{ flex: 1, minWidth: '150px', padding: '8px 12px', background: '#01041b', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
              />
              <input
                value={newPlayerId}
                onChange={(e) => setNewPlayerId(e.target.value)}
                placeholder="eFootball In-Game ID"
                style={{ flex: 1, minWidth: '150px', padding: '8px 12px', background: '#01041b', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
              />
              <button
                onClick={addManualPlayer}
                disabled={!newPlayerName.trim()}
                style={{ background: 'var(--konami-yellow)', color: '#000', border: 'none', borderRadius: '4px', padding: '8px 14px', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}
              >
                Add Athlete ↗
              </button>
              <span style={{ fontSize: '11px', color: '#88a0ff', width: '100%' }}>
                Writes to the FastAPI roster. If an OPEN cup is selected on the Tournaments tab, the athlete is also registered into that cup.
              </span>
            </div>

            <div style={{ background: '#030a38', borderRadius: '8px', overflowX: 'auto' }}>
              <div style={{ minWidth: '640px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr auto', padding: '12px 16px', background: '#081766', fontWeight: 900, fontSize: '12px', color: '#fff' }}>
                <span>RANK</span>
                <span>ATHLETE</span>
                <span>MATCHES</span>
                <span>WINS</span>
                <span>POINTS</span>
                <span>ACTIONS</span>
              </div>

              {leaderboardRows.length > 0 ? (
                leaderboardRows.map((p, idx) => (
                  <div key={p.id || idx} style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr auto', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', fontSize: '13px' }}>
                    <strong style={{ color: idx === 0 ? 'var(--konami-yellow)' : idx === 1 ? '#e0e0e0' : idx === 2 ? '#cd7f32' : '#88a0ff' }}>
                      {idx === 0 ? '👑 #1' : `#${idx + 1}`}
                    </strong>
                    <div>
                      <span style={{ color: '#fff', fontWeight: 800, display: 'block' }}>{p.display_name}</span>
                      <small style={{ color: '#88a0ff' }}>@{p.efootball_username}</small>
                    </div>
                    <span>{p.played || 0}</span>
                    <span style={{ color: '#00ff66', fontWeight: 800 }}>{p.wins || 0}</span>
                    <strong style={{ color: 'var(--konami-yellow)', fontSize: '15px' }}>{p.points || 0}</strong>
                    <button
                      onClick={() => editAthletePoints(p)}
                      style={{ background: '#081766', border: '1px solid var(--konami-yellow)', color: 'var(--konami-yellow)', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      ✏️ Edit Points
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#88a0ff', fontSize: '13px' }}>
                  No competitive player records yet. Matches update automatically.
                </div>
              )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: BROADCAST ALERTS & HEALTH */}
        {activeTab === 'broadcast' && (
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {/* BANNER EDIT */}
              <div style={{ background: '#051145', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px' }}>
                <span style={{ fontSize: '11px', color: '#88a0ff', fontWeight: 800 }}>COMMUNICATION CONTROL</span>
                <h2 style={{ fontSize: '26px', margin: '6px 0 14px', fontFamily: 'var(--font-display)', fontWeight: 900 }}>Site Broadcast Alert.</h2>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#88a0ff', display: 'block', marginBottom: '6px', fontWeight: 800 }}>ANNOUNCEMENT MESSAGE</label>
                  <input
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#030a38', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <input
                    type="checkbox"
                    id="annActive"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="annActive" style={{ fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
                    Show Banner Live on Public Homepage
                  </label>
                </div>
                <button
                  onClick={saveAnnouncement}
                  style={{ width: '100%', background: 'var(--konami-yellow)', color: '#000', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
                >
                  Update Site Broadcast ↗
                </button>
              </div>

              {/* CLOUD LATENCY */}
              <div style={{ background: '#051145', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#88a0ff', fontWeight: 800 }}>INFRASTRUCTURE STATUS</span>
                  <button onClick={() => checkHealth()} disabled={healthLoading} style={{ background: 'transparent', border: 'none', color: 'var(--konami-yellow)', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>
                    {healthLoading ? 'Pinging…' : '↻ Ping Services'}
                  </button>
                </div>
                <h2 style={{ fontSize: '26px', margin: '0 0 14px', fontFamily: 'var(--font-display)', fontWeight: 900 }}>Live Cloud Latency.</h2>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {[
                    { key: 'renderApi', title: 'Render Tournament Backend', sub: 'FastAPI /health' },
                    { key: 'alibabaCloud', title: 'Alibaba Cloud Model Studio', sub: 'Wan 2.1 / Qwen host' },
                    { key: 'metaGraphApi', title: 'Meta Graph API', sub: 'graph.facebook.com v20.0' },
                    { key: 'instagramToken', title: 'Instagram token health', sub: 'INSTAGRAM_ACCESS_TOKEN' },
                  ].map((row) => {
                    const svc = healthStatus?.services?.[row.key];
                    const status = svc?.status || (healthLoading ? 'CHECKING' : 'UNKNOWN');
                    const ok = status === 'ONLINE';
                    return (
                      <div key={row.key} style={{ background: '#030a38', padding: '12px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#fff', fontSize: '13px', display: 'block' }}>{row.title}</strong>
                          <small style={{ color: '#88a0ff', fontSize: '11px' }}>{row.sub}{svc?.detail ? ` · ${svc.detail}` : ''}</small>
                        </div>
                        <span style={{ background: ok ? '#00cc66' : status === 'UNCONFIGURED' ? '#ffaa00' : '#ff6666', color: '#000', fontWeight: 900, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                          {status}{typeof svc?.latencyMs === 'number' && svc.latencyMs >= 0 ? ` (${svc.latencyMs}ms)` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="matchday-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '25px 20px', textAlign: 'center', background: '#01041b' }}>
        <span style={{ color: '#88a0ff', fontSize: '13px' }}>
          eFootball™ 2026 Official Esports Organizer Suite · Ping services on the Alerts tab for live status
        </span>
      </footer>
    </div>
  );
}
