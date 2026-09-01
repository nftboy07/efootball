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

  useEffect(() => {
    api('/api/tournaments')
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setTs(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="matchday-shell">
      {/* 1. TOP BLACK KONAMI BAR */}
      <div className="konami-top-bar">
        <div className="konami-top-container">
          <a className="konami-corp-logo" href="https://www.konami.com/games/" target="_blank" rel="noreferrer">
            <span>KONAMI</span>
          </a>
          <div className="lang-dropdown">
            <span>English(UK)</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </div>
        </div>
      </div>

      {/* 2. OFFICIAL BLUE HEADER STAGE WITH YELLOW LOGO */}
      <header className="official-header-stage">
        <a className="official-logo-lockup" href="/">
          <div className="official-emblem-svg">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 14c17.1 0 31 13.9 31 31H19c0-17.1 13.9-31 31-31zm0 62c-17.1 0-31-13.9-31-31h62c0 17.1-13.9 31-31 31z"/>
            </svg>
          </div>
          <span className="official-title-text">
            FOOTBALL<span>™</span>
          </span>
        </a>

        {/* 3. CAPSULE / PILL NAVIGATION BAR (EXACT SCREENSHOT BUTTONS) */}
        <nav className="konami-pills-nav" aria-label="Official Navigation">
          <a className="nav-pill pill-home" href="/">
            HOME
          </a>
          <a className="nav-pill" href="#overview">
            Overview
          </a>
          <a className="nav-pill pill-yellow" href="#tournaments">
            Version Info
          </a>
          <a className="nav-pill" href="#modes">
            eSports
          </a>
          <a className="nav-pill" href="#how">
            Licenses
          </a>
          <a className="nav-pill" href="#leaderboard">
            Online Support
          </a>
          <a className="nav-pill pill-pink" href="#tournaments">
            DOWNLOAD
          </a>
          <a className="nav-pill pill-point" href="https://efootball-point.konami.net/" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e6007e" strokeWidth="8"/>
              <path d="M30 50h40M50 30v40" stroke="#e6007e" strokeWidth="8"/>
            </svg>
            <span>POINT</span>
          </a>
        </nav>
      </header>

      {/* 4. PROMOTIONAL YELLOW COINS BANNER (EXACT SCREENSHOT) */}
      <section className="konami-promo-banner">
        <a className="coins-banner-box" href="#tournaments">
          <div className="coins-banner-left">
            <div className="coin-icon">e</div>
            <h3>Get More eFootball™ Coins When You Make a Purchase!</h3>
          </div>
          <div className="coins-banner-right">
            <span>CHECK!</span>
            <div className="check-arrow-circle">➔</div>
          </div>
        </a>
      </section>

      {/* 5. FULL-WIDTH YELLOW TITLE RIBBON (EXACT SCREENSHOT) */}
      <div className="konami-yellow-ribbon">
        <h2>eFootball™ v6.0.0 & Matchday Information</h2>
      </div>

      <main>
        {/* 6. GEOMETRIC SHARD STAGE & FEATURE PANEL (EXACT SCREENSHOT) */}
        <section className="shard-hero-section" id="overview">
          <div className="konami-feature-panel">
            <div className="feature-panel-header">
              <span>New Features</span>
              <span style={{ fontSize: '18px' }}>›</span>
            </div>
            <div className="feature-panel-list">
              <a className="feature-list-item" href="#tournaments">
                <div className="item-left">
                  <span className="item-arrow">↳</span>
                  <span>Custom Tournament</span>
                </div>
                <span className="item-chevron">›</span>
              </a>
              <a className="feature-list-item" href="#tournaments">
                <div className="item-left">
                  <span className="item-arrow">↳</span>
                  <span>Game Plan Updates</span>
                </div>
                <span className="item-chevron">›</span>
              </a>
              <a className="feature-list-item" href="#modes">
                <div className="item-left">
                  <span className="item-arrow">↳</span>
                  <span>New Playing Styles</span>
                </div>
                <span className="item-chevron">›</span>
              </a>
              <a className="feature-list-item" href="#modes">
                <div className="item-left">
                  <span className="item-arrow">↳</span>
                  <span>New Team Playstyles</span>
                </div>
                <span className="item-chevron">›</span>
              </a>
              <a className="feature-list-item" href="#modes">
                <div className="item-left">
                  <span className="item-arrow">↳</span>
                  <span>Link-up Play Updates</span>
                </div>
                <span className="item-chevron">›</span>
              </a>
              <a className="feature-list-item" href="#how">
                <div className="item-left">
                  <span className="item-arrow">↳</span>
                  <span>Position Training Specifications</span>
                </div>
                <span className="item-chevron">›</span>
              </a>
            </div>
          </div>
        </section>

        {/* 7. ACTIVE MATCHDAY CUPS (SPECIAL EDITIONS) */}
        <section className="section" id="tournaments">
          <div className="section-heading">
            <div>
              <span className="section-index">01 / OFFICIAL MATCHDAY CUPS</span>
              <h2>
                Choose your
                <br />
                <em>Matchday.</em>
              </h2>
            </div>
            <p>
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

        {/* 8. GAME MODES PILLARS (AUTHENTIC OVERVIEW) */}
        <section className="section" id="modes">
          <div className="section-heading">
            <div>
              <span className="section-index">02 / GAME MODES</span>
              <h2>
                Let&apos;s Play
                <br />
                <em>eFootball™.</em>
              </h2>
            </div>
            <p>
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

        {/* 9. ROUTE SECTION */}
        <section className="route-section" id="how">
          <div className="route-intro">
            <span className="section-index">03 / THE ROUTE</span>
            <h2>
              One lobby.
              <br />
              <em>Three rounds.</em>
            </h2>
            <p>
              Every cup follows a rapid 3-round knockout structure. Win your fixture, submit screenshot proof, and advance
              toward the title.
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

        {/* 10. RANKINGS TABLE */}
        <section className="section" id="leaderboard">
          <div className="section-heading">
            <div>
              <span className="section-index">04 / COMMUNITY STANDINGS</span>
              <h2>
                Play for
                <br />
                <em>the table.</em>
              </h2>
            </div>
            <p>
              Confirmed match results earn points, match wins, and a spot at the top of the official rankings table.
            </p>
          </div>
          <Leaderboard />
        </section>
      </main>

      {/* 11. OFFICIAL FOOTER */}
      <footer className="matchday-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="konami-footer-logo">KONAMI</span>
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

