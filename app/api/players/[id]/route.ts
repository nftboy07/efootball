import { NextRequest, NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://efootball-tournament-kwq4.onrender.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
  }

  try {
    // 1. Fetch tournaments and leaderboards
    const [tournamentsRes, leaderboardRes] = await Promise.all([
      fetch(`${API}/api/tournaments`, { next: { revalidate: 15 } }),
      fetch(`${API}/api/leaderboard`, { next: { revalidate: 15 } }),
    ]);

    const tournaments = await tournamentsRes.json().catch(() => []);
    const leaderboard = await leaderboardRes.json().catch(() => []);

    // 2. Find player in leaderboard or tournaments
    const statsEntry = Array.isArray(leaderboard)
      ? leaderboard.find((p: any) => p.id === id || p.efootball_username?.toLowerCase() === id.toLowerCase())
      : null;

    let playerInfo: any = statsEntry;

    // Search in tournament player lists if not in leaderboard yet
    if (!playerInfo && Array.isArray(tournaments)) {
      for (const t of tournaments) {
        const found = t.players?.find(
          (p: any) => p.id === id || p.efootball_username?.toLowerCase() === id.toLowerCase()
        );
        if (found) {
          playerInfo = {
            ...found,
            played: 0,
            wins: 0,
            losses: 0,
            goals_for: 0,
            goals_against: 0,
            points: 0,
          };
          break;
        }
      }
    }

    if (!playerInfo) {
      // Return default placeholder profile for preview
      playerInfo = {
        id,
        display_name: id.toUpperCase(),
        efootball_username: id,
        played: 0,
        wins: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        points: 0,
      };
    }

    const played = playerInfo.played || 0;
    const wins = playerInfo.wins || 0;
    const losses = playerInfo.losses || 0;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    const elo = 1000 + wins * 25 - losses * 15;

    // Badges calculation
    const badges = [];
    if (wins >= 1) badges.push({ id: 'first_win', name: 'First Blood', desc: 'Won first official match', icon: '⚡' });
    if (wins >= 3) badges.push({ id: 'hat_trick', name: 'Tournament Warrior', desc: 'Achieved 3+ tournament victories', icon: '🏆' });
    if (winRate >= 70 && played >= 3) badges.push({ id: 'pro_elite', name: 'Elite Striker', desc: 'Maintained 70%+ win rate', icon: '🔥' });
    if (playerInfo.goals_for >= 10) badges.push({ id: 'golden_boot', name: 'Golden Boot', desc: 'Scored 10+ tournament goals', icon: '⚽' });

    return NextResponse.json({
      player: {
        id: playerInfo.id,
        displayName: playerInfo.display_name,
        username: playerInfo.efootball_username,
        elo,
        played,
        wins,
        losses,
        goalsFor: playerInfo.goals_for || 0,
        goalsAgainst: playerInfo.goals_against || 0,
        goalDiff: (playerInfo.goals_for || 0) - (playerInfo.goals_against || 0),
        points: playerInfo.points || 0,
        winRate,
        badges,
        rankTier: elo >= 1200 ? 'DIV 1 CHAMPION' : elo >= 1100 ? 'DIV 2 CONTENDER' : 'DIV 3 CHALLENGER',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load player' }, { status: 500 });
  }
}
