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
      {/* KONAMI TOP BRAND BAR */}
      <div className="konami-top-bar">
        <div className="konami-top-container">
          <a className="konami-corp-logo" href="https://www.konami.com/games/" target="_blank" rel="noreferrer">
            <span>KONAMI</span>
          </a>
          <div className="konami-top-right">
            <span className="lang-tag">🌐 English (UK)</span>
          </div>
        </div>
      </div>

      {/* HEADER NAVIGATION */}
      <header className="matchday-nav">
        <a className="brand-lockup" href="/">
          <div className="konami-emblem-icon">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 14c17.1 0 31 13.9 31 31H19c0-17.1 13.9-31 31-31zm0 62c-17.1 0-31-13.9-31-31h62c0 17.1-13.9 31-31 31z"/>
            </svg>
          </div>
          <span>
            eFootball<b>™ 2026</b>
          </span>
        </a>

        <nav aria-label="Primary navigation">
          <a href="#tournaments">Matchday Cups</a>
          <a href="#modes">Game Modes</a>
          <a href="#info">News & Info</a>
          <a href="#how">Route</a>
          <a href="#leaderboard">Standings</a>
          <a className="nav-admin" href="/admin">
            Organizer Hub ↗
          </a>
        </nav>
      </header>

      <main>
        {/* HERO SECTION WITH KONAMI BOKEH ORBS (YELLOW & BLUE COMBO) */}
        <section className="matchday-hero">
          {/* FLOATING KONAMI BOKEH GLOW ORBS */}
          <div className="konami-orb orb-blue-lg" />
          <div className="konami-orb orb-yellow-md" />
          <div className="konami-orb orb-blue-sm" />
          <div className="konami-orb orb-yellow-sm" />
          <div className="konami-orb orb-center-glow" />

          <div className="hero-copy">
            <span className="live-kicker">
              <i /> eFootball™ OFFICIAL COMMUNITY CIRCUIT
            </span>
            <div className="konami-hero-logo-box">
              <div className="hero-emblem-large">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 18c17.7 0 32 14.3 32 32H18c0-17.7 14.3-32 32-32zm0 64c-17.7 0-32-14.3-32-32h64c0 17.7-14.3 32-32 32z"/>
                </svg>
              </div>
              <h1 className="hero-brand-title">
                eFOOTBALL<span>™</span>
              </h1>
            </div>
            <h2>
              Play the match.
              <br />
              <em>Own the moment.</em>
            </h2>
            <p>
              From &quot;PES&quot; to &quot;eFootball™&quot;. Step into the next generation of football esports. 
              Join verified community lobbies, play single-elimination cups, and climb to the top of the global rankings.
            </p>
            <div className="hero-actions">
              <a className="matchday-button primary" href="#tournaments">
                Enter Next Matchday <span>↗</span>
              </a>
              <a className="matchday-button secondary" href="#modes">
                Explore Modes <span>↓</span>
              </a>
            </div>
          </div>

          <div className="scoreboard-hero">
            <div className="scoreboard-label">
              <span>SPECIAL COMMUNITY EDITION</span>
              <span>LOBBY #01</span>
            </div>
            <div className="scoreboard-main">
              <span>
                MATCHDAY
                <br />
                CUP
              </span>
              <strong>08</strong>
            </div>
            <div className="scoreboard-meta">
              <span>8 PLAYERS</span>
              <span>·</span>
              <span>FREE TO PLAY</span>
              <span>·</span>
              <span>MOBILE & CONSOLE</span>
            </div>
            <div className="pitch-lines" />
          </div>
        </section>

        {/* SIGNAL HIGHLIGHT BANNER */}
        <section className="signal-bar">
          <span>FREE TO PLAY</span>
          <i />
          <span>8 PLAYER KNOCKOUT</span>
          <i />
          <span>VERIFIED KONAMI ROOMS</span>
          <i />
          <span>CROSS-PLAY READY</span>
          <i />
          <span>GLOBAL STANDINGS</span>
        </section>

        {/* KONAMI GAME MODES PILLARS */}
        <section className="section modes-section" id="modes">
          <div className="section-heading">
            <div>
              <span className="section-index">01 / OFFICIAL GAME MODES</span>
              <h2>
                How to play
                <br />
                <em>eFootball™.</em>
              </h2>
            </div>
            <p>
              Choose how you compete. Whether managing your custom Dream Team or entering custom room lobbies with friends.
            </p>
          </div>

          <div className="modes-grid">
            <article className="mode-card">
              <span className="mode-tag">01 · PVP ARENA</span>
              <h3>Authentic Team</h3>
              <p>
                Take the pitch with official licensed clubs and national teams in organized custom room matchdays.
              </p>
              <div className="mode-badge">CUSTOM ROOM CODE ENTRY</div>
            </article>

            <article className="mode-card featured">
              <span className="mode-tag">02 · COMPETITIVE</span>
              <h3>Dream Team Cup</h3>
              <p>
                Assemble your favourite active stars and football legends to fight through high-stakes 8-player tournaments.
              </p>
              <div className="mode-badge highlight">8-PLAYER KNOCKOUT ROUTE</div>
            </article>

            <article className="mode-card">
              <span className="mode-tag">03 · MULTIPLAYER</span>
              <h3>Friend & Co-op Match</h3>
              <p>
                Link up with friends or challenge rivals across Android, iOS, Steam, PlayStation 5, and Xbox Series X|S.
              </p>
              <div className="mode-badge">CROSS-PLATFORM PLAY</div>
            </article>
          </div>
        </section>

        {/* TOURNAMENTS SECTION (KONAMI SPECIAL EDITIONS) */}
        <section className="section matchday-section" id="tournaments">
          <div className="section-heading">
            <div>
              <span className="section-index">02 / ACTIVE MATCHDAY ARENAS</span>
              <h2>
                Special Edition
                <br />
                <em>Cups.</em>
              </h2>
            </div>
            <p>
              Reserve your slot before the draw locks in. Instant player token generation with live bracket tracking.
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

        {/* KONAMI OFFICIAL NEWS & NOTICE BOARD */}
        <section className="section info-section" id="info">
          <div className="section-heading">
            <div>
              <span className="section-index">03 / NEWS & NOTICES</span>
              <h2>
                Matchday
                <br />
                <em>bulletin.</em>
              </h2>
            </div>
            <p>
              Stay updated with tournament schedules, lobby guidelines, and official eFootball™ community announcements.
            </p>
          </div>

          <div className="info-board">
            <div className="info-item">
              <div className="info-meta">
                <span className="info-date">01/09/2026</span>
                <span className="info-badge badge-cyan">MATCHDAY</span>
              </div>
              <h4>Community Cup #01 Registration Now Open</h4>
              <p>The 8-player bracket is open for free registration. Enter your gamer tag to lock your spot in the official draw.</p>
            </div>

            <div className="info-item">
              <div className="info-meta">
                <span className="info-date">01/09/2026</span>
                <span className="info-badge badge-pink">IMPORTANT</span>
              </div>
              <h4>Match Screenshot Submission Rules</h4>
              <p>All players must upload a screenshot of the final score screen in-game to verify match progress and points.</p>
            </div>

            <div className="info-item">
              <div className="info-meta">
                <span className="info-date">30/08/2026</span>
                <span className="info-badge badge-yellow">SYSTEM</span>
              </div>
              <h4>High-Speed Cloud Storage & Anti-Cheat Validation</h4>
              <p>All score submissions are verified with direct image uploads and distributed rate-limiting for fair competition.</p>
            </div>
          </div>
        </section>

        {/* FORMAT SECTION */}
        <section className="route-section" id="how">
          <div className="route-intro">
            <span className="section-index">04 / THE ROUTE</span>
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

        {/* RANKINGS LEADERBOARD */}
        <section className="section rankings-section" id="leaderboard">
          <div className="section-heading">
            <div>
              <span className="section-index">05 / STANDINGS</span>
              <h2>
                Play for
                <br />
                <em>the table.</em>
              </h2>
            </div>
            <p>
              Every confirmed match earns community ranking points, match wins, and a spot at the top of the leaderboard.
            </p>
          </div>
          <Leaderboard />
        </section>

        {/* PLATFORM COMPATIBILITY BAR */}
        <section className="platform-bar">
          <span className="platform-label">COMPATIBLE PLATFORMS:</span>
          <div className="platform-pills">
            <span>📱 iOS App Store</span>
            <span>🤖 Google Play</span>
            <span>💻 Steam PC</span>
            <span>🎮 PlayStation 5</span>
            <span>🎮 Xbox Series X|S</span>
          </div>
        </section>
      </main>

      {/* OFFICIAL KONAMI FOOTER */}
      <footer className="matchday-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="konami-footer-logo">KONAMI</span>
            <span className="footer-tagline">
              eFootball <b>2026</b> Official Community Circuit
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
            This website is an independent community esports tournament tournament hub operated for competitive eFootball players.
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
