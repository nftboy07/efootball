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
      {/* HEADER NAVIGATION */}
      <header className="matchday-nav">
        <a className="brand-lockup" href="/">
          <span className="brand-mark">eF</span>
          <span>
            eFootball <b>2026</b>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#tournaments">Live Cups</a>
          <a href="#how">Format</a>
          <a href="#leaderboard">Rankings</a>
          <a className="nav-admin" href="/admin">
            Organizer ↗
          </a>
        </nav>
      </header>

      <main>
        {/* HERO SECTION WITH KONAMI BOKEH ORBS */}
        <section className="matchday-hero">
          {/* KONAMI BOKEH ORBS */}
          <div className="konami-orb orb-cyan-lg" />
          <div className="konami-orb orb-pink-md" />
          <div className="konami-orb orb-cyan-sm" />
          <div className="konami-orb orb-magenta-sm" />

          <div className="hero-copy">
            <span className="live-kicker">
              <i /> eFootball™ 2026 COMMUNITY CIRCUIT
            </span>
            <h1>
              Play the match.
              <br />
              <em>Own the moment.</em>
            </h1>
            <p>
              Official community matchdays built for real players. Reserve your slot, enter the custom Konami
              lobby code, and make your championship run to the grand final.
            </p>
            <div className="hero-actions">
              <a className="matchday-button primary" href="#tournaments">
                Enter Next Cup <span>↗</span>
              </a>
              <a className="text-link" href="#how">
                Tournament Route <span>↓</span>
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
                COMMUNITY
                <br />
                CUP
              </span>
              <strong>08</strong>
            </div>
            <div className="scoreboard-meta">
              <span>8 PLAYERS</span>
              <span>·</span>
              <span>FREE ENTRY</span>
              <span>·</span>
              <span>MOBILE / CONSOLE</span>
            </div>
            <div className="pitch-lines" />
          </div>
        </section>

        {/* SIGNAL HIGHLIGHT BANNER */}
        <section className="signal-bar">
          <span>NO PAYWALLS</span>
          <i />
          <span>8 PLAYER KNOCKOUT</span>
          <i />
          <span>VERIFIED KONAMI ROOMS</span>
          <i />
          <span>GLOBAL RANKINGS</span>
        </section>

        {/* TOURNAMENTS SECTION */}
        <section className="section matchday-section" id="tournaments">
          <div className="section-heading">
            <div>
              <span className="section-index">01 / ACTIVE ARENAS</span>
              <h2>
                Choose your
                <br />
                <em>matchday.</em>
              </h2>
            </div>
            <p>
              Reserve your slot before the bracket fills up. Instant player token generation with live bracket tracking.
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
                    <h3>{t.name}</h3>
                    <p>
                      {String(count).padStart(2, '0')}{' '}
                      <small>/ {String(max).padStart(2, '0')} Registered</small>
                    </p>
                    <div className="progress-track">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <a className="matchday-button primary" href={`/tournaments/${t.id}`}>
                    {isFull ? 'View Live Bracket' : 'Reserve Slot'} <span>↗</span>
                  </a>
                </article>
              );
            })}
          </div>
        </section>


        {/* FORMAT SECTION */}
        <section className="route-section" id="how">
          <div className="route-intro">
            <span className="section-index">02 / THE ROUTE</span>
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
              <span className="section-index">03 / STANDINGS</span>
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
      </main>

      {/* FOOTER */}
      <footer className="matchday-footer">
        <span>
          eFootball <b>2026</b>
        </span>
        <span>Independent community esports platform · Not affiliated with KONAMI.</span>
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
