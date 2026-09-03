'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://efootball-tournament-kwq4.onrender.com';

type Tournament = {
  id: string;
  name: string;
  status: string;
  players: any[];
  max_players: number;
  efootball_id?: string | null;
  prize_pool?: string | null;
};

const featuredTournament: Tournament = {
  id: 'EC-C97418',
  name: 'Community Cup 1',
  status: 'OPEN',
  players: [],
  max_players: 8,
};

async function api(path: string, init?: RequestInit) {
  const r = await fetch(API + path, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || 'Request failed');
  return d;
}

export default function Home() {
  const [ts, setTs] = useState<Tournament[]>([featuredTournament]);
  const [loading, setLoading] = useState(true);

  const [announcement, setAnnouncement] = useState<{ active: boolean; message: string }>({
    active: false,
    message: '',
  });

  useEffect(() => {
    api('/api/tournaments')
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setTs(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/admin/announcement')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.active === 'boolean') setAnnouncement(d);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="matchday-shell">
      {/* 0. SITE-WIDE BROADCAST BANNER */}
      {announcement.active && (
        <div
          style={{
            background: 'linear-gradient(90deg, #ff0055, #ffaa00)',
            color: '#fff',
            padding: '10px 16px',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: '14px',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.5px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📢 {announcement.message}</span>
          <a
            href="/#tournaments"
            style={{
              background: '#000',
              color: '#ffd700',
              padding: '2px 10px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '12px',
              marginLeft: '8px',
            }}
          >
            ENTER ARENA ↗
          </a>
        </div>
      )}

      {/* 1. TOP BLACK KONAMI HEADER (MATCHING SCREENSHOT) */}
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

      {/* 2. OFFICIAL BLUE HEADER STAGE (MATCHING SCREENSHOT) */}
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

        {/* 3. CAPSULE / PILL NAVIGATION (MATCHING SCREENSHOT) */}
        <nav className="konami-nav-pills" aria-label="Official eFootball Navigation">
          <a className="pill-btn home" href="/">
            HOME
          </a>
          <a className="pill-btn" href="#overview">
            Overview
          </a>
          <a className="pill-btn" href="#tournaments">
            Version Info
          </a>
          <a className="pill-btn" href="#modes">
            eSports
          </a>
          <a className="pill-btn" href="#how">
            Licenses
          </a>
          <a className="pill-btn" href="#leaderboard">
            Online Support
          </a>
          <a className="pill-btn" href="#reels" style={{ color: 'var(--konami-yellow)', fontWeight: 800 }}>
            🎬 REELS
          </a>
          <a className="pill-btn download" href="#tournaments">
            DOWNLOAD
          </a>
          <a className="pill-btn point" href="https://efootball-point.konami.net/" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e6007e" strokeWidth="8"/>
              <path d="M30 50h40M50 30v40" stroke="#e6007e" strokeWidth="8"/>
            </svg>
            <span>POINT</span>
          </a>
        </nav>
      </div>

      {/* 4. PROMOTIONAL YELLOW COINS BANNER (MATCHING SCREENSHOT) */}
      <section className="konami-coins-banner">
        <a className="coins-banner-inner" href="#tournaments">
          <div className="coins-left">
            <div className="coins-e-badge">e</div>
            <h3 className="coins-title">Get More eFootball™ Coins When You Make a Purchase!</h3>
          </div>
          <div className="coins-right">
            <span>CHECK!</span>
            <div className="arrow-circle">➔</div>
          </div>
        </a>
      </section>

      {/* 5. OFFICIAL FULL-WIDTH HERO ARTWORK (MESSI & YAMAL) */}
      <section className="konami-hero-artwork-stage">
        <Image
          src="/images/konami_hero_banner.png"
          alt="eFootball Official Key Visual - Lionel Messi and Lamine Yamal"
          width={1440}
          height={640}
          priority
          className="hero-artwork-img"
          unoptimized
        />
        <div className="hero-overlay-content">
          <div>
            <span className="section-index">OFFICIAL COMMUNITY MATCHDAY CIRCUIT</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(32px, 4vw, 54px)', margin: '6px 0 0', color: '#fff', textTransform: 'uppercase', textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
              Play the match. <span style={{ color: 'var(--konami-yellow)' }}>Own the moment.</span>
            </h1>
          </div>
          <a className="hero-cta-btn" href="#tournaments">
            Enter Cup Lobbies <span>↗</span>
          </a>
        </div>
      </section>

      <main className="main-content-flow">
        {/* 6. TOURNAMENT MATCHDAY CUPS (SPECIAL COMMUNITY EDITIONS) */}
        <section className="section-container" id="tournaments">
          <div className="section-title-wrap">
            <div>
              <span className="section-index">01 / ACTIVE MATCHDAY CUPS</span>
              <h2 className="section-heading">
                Choose your <br />
                <em>Matchday Arena.</em>
              </h2>
            </div>
            <p className="section-desc">
              Free competitive eFootball™ single-elimination cups. Lock your slot and receive your player passcode for the official Konami custom room.
            </p>
          </div>

          <div className="cup-grid">
            {ts.map((t) => {
              const count = t.players?.length || 0;
              const max = t.max_players || 8;
              const pct = Math.min(100, (count / max) * 100);
              const isFull = count >= max;

              return (
                <article className="cup-card" key={t.id}>
                  <div className="cup-card-top">
                    <span className="cup-status">
                      <i /> {t.status}
                    </span>
                    <span className="cup-number">{t.id}</span>
                  </div>

                  <div className="cup-card-body">
                    <span className="cup-edition-tag">SPECIAL COMMUNITY CUP</span>
                    <h3>{t.name}</h3>
                    <p>
                      {String(count).padStart(2, '0')}{' '}
                      <small>/ {String(max).padStart(2, '0')} Registered</small>
                    </p>
                    {t.prize_pool ? (
                      <p style={{ color: 'var(--konami-yellow)', fontSize: '13px', fontWeight: 800, margin: '4px 0 0' }}>
                        {t.prize_pool}
                      </p>
                    ) : null}
                    <div className="progress-track">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <a className="matchday-button primary full" href={`/tournaments/${t.id}`}>
                    {isFull ? 'View Live Bracket' : 'Reserve Slot'} <span>↗</span>
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        {/* 7. OFFICIAL OVERVIEW & GAME MODES */}
        <section className="section-container" id="modes">
          <div className="section-title-wrap">
            <div>
              <span className="section-index">02 / OFFICIAL GAME MODES</span>
              <h2 className="section-heading">
                Let&apos;s Play <br />
                <em>eFootball™.</em>
              </h2>
            </div>
            <p className="section-desc">
              You have a ton of options on how to play, whether Authentic Team or building your dream team to compete in community circuits.
            </p>
          </div>

          <div className="modes-grid">
            <article className="mode-card">
              <span className="mode-tag">01 · PVP ARENA</span>
              <h3>Authentic Team</h3>
              <p>
                Take the pitch with real clubs and national teams in custom matchday rooms with in-game Konami room codes.
              </p>
              <div className="mode-badge">CUSTOM ROOM CODE ENTRY</div>
            </article>

            <article className="mode-card featured">
              <span className="mode-tag">02 · COMPETITIVE</span>
              <h3>Dream Team Cup</h3>
              <p>
                Choose your favourite active footballers and football legends to create your original team and compete for championship titles.
              </p>
              <div className="mode-badge highlight">8-PLAYER KNOCKOUT ROUTE</div>
            </article>

            <article className="mode-card">
              <span className="mode-tag">03 · MULTIPLAYER</span>
              <h3>Friend & Co-op Match</h3>
              <p>
                Play with friends or challenge rivals across Android, iOS, Steam PC, PlayStation 5, and Xbox Series X|S.
              </p>
              <div className="mode-badge">CROSS-PLATFORM PLAY</div>
            </article>
          </div>
        </section>

        {/* 8. KNOCKOUT ROUTE */}
        <section className="route-section" id="how">
          <div className="route-intro">
            <span className="section-index">03 / THE ROUTE</span>
            <h2>
              One lobby. <br />
              <em>Three rounds.</em>
            </h2>
            <p className="section-desc">
              Every cup follows a rapid 3-round knockout structure. Win your fixture, submit screenshot proof, and advance toward the title.
            </p>
          </div>

          <div className="route-track">
            <div>
              <b>01</b>
              <strong>QUARTERFINALS</strong>
              <span>8 → 4 Players</span>
            </div>
            <i />
            <div>
              <b>02</b>
              <strong>SEMIFINALS</strong>
              <span>4 → 2 Players</span>
            </div>
            <i />
            <div className="final-stop">
              <b>03</b>
              <strong>GRAND FINAL</strong>
              <span>2 → 1 Champion</span>
            </div>
          </div>
        </section>

        {/* 9. STANDINGS TABLE */}
        <section className="section-container" id="leaderboard" style={{ marginTop: '70px' }}>
          <div className="section-title-wrap">
            <div>
              <span className="section-index">04 / COMMUNITY STANDINGS</span>
              <h2 className="section-heading">
                Play for <br />
                <em>the table.</em>
              </h2>
            </div>
            <p className="section-desc">
              Confirmed match results earn points, match wins, and a spot at the top of the official rankings table.
            </p>
          </div>
          <Leaderboard />
        </section>

        {/* 10. OFFICIAL AI REELS & MATCH HIGHLIGHTS SHOWCASE */}
        <section className="section-container" id="reels" style={{ marginTop: '70px', marginBottom: '50px' }}>
          <div className="section-title-wrap">
            <div>
              <span className="section-index">05 / MATCHDAY HIGHLIGHTS</span>
              <h2 className="section-heading">
                Trending Reels & <br />
                <em>Superstar Highlights.</em>
              </h2>
            </div>
            <p className="section-desc">
              Cinematic AI match highlights, viral goal moments, and scheduled community tournament reels.
            </p>
          </div>
          <ReelsShowcase />
        </section>
      </main>

      {/* 10. OFFICIAL FOOTER LOCKUP */}
      <footer className="matchday-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="konami-red-logo">KONAMI</span>
            <span className="footer-tagline">
              eFootball <b>2026</b> Community Circuit
            </span>
          </div>
          <div className="social-links">
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
          </div>
        </div>

        <div className="footer-disclaimer">
          <p>
            &quot;eFootball&quot;, &quot;e-Football&quot;, &quot;PES&quot;, and &quot;KONAMI&quot; are registered trademarks of Konami Digital Entertainment Co., Ltd.
          </p>
          <p>
            This website is an independent community esports tournament hub operated for competitive eFootball players.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    api('/api/leaderboard')
      .then((data) => {
        if (Array.isArray(data)) setRows(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="ranking-table">
      <div className="ranking-head">
        <span>RANK</span>
        <span>PLAYER</span>
        <span>MATCHES</span>
        <span>WINS</span>
        <span>PTS</span>
      </div>
      {rows.slice(0, 10).map((p, i) => (
        <div className="ranking-row" key={p.id || i}>
          <b>#{String(i + 1).padStart(2, '0')}</b>
          <strong>{p.display_name}</strong>
          <span>{p.played || 0}</span>
          <span>{p.wins || 0}</span>
          <em>{p.points || 0}</em>
        </div>
      ))}
      {!rows.length && (
        <div className="ranking-empty">The leaderboard updates automatically after match results are confirmed.</div>
      )}
    </div>
  );
}

function ReelsShowcase() {
  const [reels, setReels] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/reels-queue?public=1')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.queue) && d.queue.length > 0) {
          setReels(d.queue.slice(0, 6));
        }
      })
      .catch(() => {});
  }, []);

  if (!reels.length) {
    return (
      <div
        style={{
          background: 'rgba(3, 10, 56, 0.7)',
          border: '1px solid var(--konami-yellow)',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>🎬</span>
        <h3 style={{ color: '#fff', fontSize: '20px', margin: '0 0 8px' }}>Official Matchday AI Reels</h3>
        <p style={{ color: '#88a0ff', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px' }}>
          Follow our official channel for daily goal highlights, skill moves, and community championship reels!
        </p>
        <a
          href="https://www.instagram.com/efbt__2026/"
          target="_blank"
          rel="noreferrer"
          className="matchday-button primary"
          style={{ padding: '12px 28px' }}
        >
          FOLLOW ON INSTAGRAM @efbt__2026 ↗
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
      {reels.map((reel) => (
        <div
          key={reel.id}
          style={{
            background: 'linear-gradient(180deg, #081766 0%, #030a38 100%)',
            border: '1px solid rgba(255, 255, 0, 0.4)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {reel.videoUrl ? (
            <video
              controls
              src={reel.videoUrl}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                background: '#000',
              }}
              playsInline
            />
          ) : (
            <div style={{ height: '300px', background: '#000be0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--konami-yellow)', fontWeight: 900 }}>
              ⚽ {reel.playerTag || 'SUPERSTAR HIGHLIGHT'}
            </div>
          )}

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span
                  style={{
                    background: 'var(--konami-yellow)',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  ⭐ {reel.playerTag || 'SUPERSTAR'}
                </span>
                <span style={{ fontSize: '11px', color: '#88a0ff' }}>
                  {reel.status === 'PUBLISHED' ? 'PUBLISHED ✓' : 'SCHEDULED REEL'}
                </span>
              </div>
              <p
                style={{
                  color: '#ddd',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  margin: '0 0 14px',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {reel.caption}
              </p>
            </div>

            <a
              href="https://www.instagram.com/efbt__2026/"
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '12px',
                padding: '10px',
                borderRadius: '6px',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              WATCH ON INSTAGRAM @efbt__2026 ↗
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}


