import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PlayerData {
  id: string;
  displayName: string;
  username: string;
  elo: number;
  played: number;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  winRate: number;
  rankTier: string;
  badges: Array<{ id: string; name: string; desc: string; icon: string }>;
}

async function getPlayer(id: string): Promise<PlayerData | null> {
  const host = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.efootball2026.online';
  try {
    const res = await fetch(host + '/api/players/' + encodeURIComponent(id), {
      next: { revalidate: 10 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.player || null;
  } catch {
    return null;
  }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(id);

  if (!player) {
    return notFound();
  }

  const shareText = encodeURIComponent(
    'Check out my official eFootball 2026 Esports profile! Elo: ' + player.elo + ' | Win Rate: ' + player.winRate + '% | Rank: ' + player.rankTier
  );
  const profileUrl = encodeURIComponent('https://www.efootball2026.online/players/' + id);

  return (
    <div className="matchday-root">
      {/* 1. TOP TICKER */}
      <div className="konami-official-bar">
        <div className="konami-bar-inner">
          <span className="konami-badge">eFootball™ 2026</span>
          <span className="konami-text">OFFICIAL ESPORTS PLAYER PASSPORT</span>
          <span className="konami-status">• LIVE VERIFIED</span>
        </div>
      </div>

      {/* 2. HEADER */}
      <header className="matchday-header">
        <div className="matchday-nav-container">
          <div className="matchday-brand">
            <Link href="/" className="matchday-logo">
              eFootball<span>2026</span>
            </Link>
            <span className="matchday-region-tag">PLAYER PASSPORT</span>
          </div>

          <nav className="matchday-nav-links">
            <Link href="/" className="matchday-nav-link">
              OVERVIEW
            </Link>
            <Link href="/#tournaments" className="matchday-nav-link active">
              TOURNAMENTS
            </Link>
            <Link href="/#schedule" className="matchday-nav-link">
              SCHEDULE
            </Link>
            <Link href="/admin" className="matchday-nav-link">
              ADMIN HUB 🔒
            </Link>
          </nav>
        </div>
      </header>

      {/* 3. HERO STAGE */}
      <div className="matchday-hero-stage">
        <div className="matchday-hero-inner">
          <span className="matchday-category-tag">ESPORTS ATHLETE DOSSIER</span>
          <h1 className="matchday-hero-title" style={{ fontSize: '48px' }}>
            {player.displayName} <em>({player.username})</em>
          </h1>
          <p className="matchday-hero-desc">
            Official competitive tournament record, Elo ranking, and career milestone achievements.
          </p>
        </div>
      </div>

      {/* 4. MAIN CONTENT */}
      <main className="matchday-main">
        <div className="matchday-container">
          {/* PROFILE HERO CARD */}
          <div
            style={{
              background: 'linear-gradient(135deg, #081766 0%, #030a38 100%)',
              border: '2px solid var(--konami-yellow)',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '30px',
              boxShadow: '0 0 35px rgba(255, 255, 0, 0.15)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd700, #ff0055)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#000',
                  boxShadow: '0 0 20px rgba(255,215,0,0.5)',
                }}
              >
                ⚽
              </div>
              <div>
                <span
                  style={{
                    background: 'var(--konami-yellow)',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '1px',
                  }}
                >
                  {player.rankTier}
                </span>
                <h2 style={{ fontSize: '32px', margin: '8px 0 4px', color: '#fff' }}>
                  {player.displayName}
                </h2>
                <p style={{ margin: 0, color: '#88a0ff', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                  eFootball User ID: @{player.username}
                </p>
              </div>
            </div>

            {/* ELO & SHARE ACTION */}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase' }}>COMPETITIVE ELO RATING</span>
                <div style={{ fontSize: '44px', fontWeight: 900, color: 'var(--konami-yellow)', fontFamily: 'var(--font-mono)' }}>
                  {player.elo} <span style={{ fontSize: '18px', color: '#fff' }}>PTS</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <a
                  href={'https://api.whatsapp.com/send?text=' + shareText + '%20' + profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#25D366',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                >
                  Share on WhatsApp ↗
                </a>
                <a
                  href={'https://twitter.com/intent/tweet?text=' + shareText + '&url=' + profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#1DA1F2',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                >
                  Share on X ↗
                </a>
              </div>
            </div>
          </div>

          {/* STATS MATRIX */}
          <div className="admin-grid-2" style={{ marginBottom: '30px' }}>
            <div className="admin-card">
              <span className="section-index">PERFORMANCE METRICS</span>
              <h3 className="section-heading" style={{ fontSize: '28px', margin: '8px 0 20px' }}>
                Match Record & <em>Efficiency.</em>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#88a0ff' }}>WIN RATE</span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#00ff66', marginTop: '6px' }}>
                    {player.winRate}%
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#88a0ff' }}>MATCHES PLAYED</span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginTop: '6px' }}>
                    {player.played}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#88a0ff' }}>TOTAL WINS</span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--konami-yellow)', marginTop: '6px' }}>
                    {player.wins}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#88a0ff' }}>LOSSES</span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#ff6666', marginTop: '6px' }}>
                    {player.losses}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#88a0ff' }}>GOALS SCORED</span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginTop: '6px' }}>
                    {player.goalsFor}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#88a0ff' }}>GOAL DIFFERENTIAL</span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: player.goalDiff >= 0 ? '#00ff66' : '#ff6666', marginTop: '6px' }}>
                    {player.goalDiff > 0 ? '+' + player.goalDiff : player.goalDiff}
                  </div>
                </div>
              </div>
            </div>

            {/* CAREER BADGES & TROPHIES */}
            <div className="admin-card">
              <span className="section-index">TROPHY ROOM</span>
              <h3 className="section-heading" style={{ fontSize: '28px', margin: '8px 0 20px' }}>
                Milestone <em>Achievements.</em>
              </h3>

              {player.badges.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {player.badges.map((badge) => (
                    <div
                      key={badge.id}
                      style={{
                        background: 'rgba(0, 11, 224, 0.3)',
                        border: '1px solid rgba(255, 255, 0, 0.4)',
                        borderRadius: '8px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '28px' }}>{badge.icon}</span>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>{badge.name}</strong>
                        <span style={{ color: '#aaa', fontSize: '12px' }}>{badge.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#88a0ff', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>Compete in official Community Cups to unlock career badges and trophies!</p>
                </div>
              )}
            </div>
          </div>

          {/* RETURN CTA */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/#tournaments" className="matchday-button primary" style={{ padding: '14px 32px' }}>
              BROWSE ACTIVE COMMUNITY CUPS ↗
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
