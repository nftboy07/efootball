export const TOURNAMENT_API =
  process.env.TOURNAMENT_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://efootball-tournament-kwq4.onrender.com';

export const GRAPH_API = 'https://graph.facebook.com/v20.0';

export const COOKIE_ADMIN = 'efootball_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
