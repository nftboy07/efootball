import os, sqlite3, secrets, json
from datetime import datetime, timezone

DATABASE_URL = os.getenv('DATABASE_URL', '').strip()

SCHEMA = '''
CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL, efootball_id TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, efootball_username TEXT NOT NULL, token TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tournament_players (tournament_id TEXT NOT NULL, player_id TEXT NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY(tournament_id, player_id), UNIQUE(tournament_id, player_id));
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, tournament_id TEXT NOT NULL, round TEXT NOT NULL, slot INTEGER NOT NULL, player_a TEXT, player_b TEXT, score_a INTEGER, score_b INTEGER, winner TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, match_id TEXT NOT NULL, player_id TEXT NOT NULL, score_a INTEGER NOT NULL, score_b INTEGER NOT NULL, evidence_url TEXT, note TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS disputes (id TEXT PRIMARY KEY, match_id TEXT NOT NULL, player_id TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stats (player_id TEXT PRIMARY KEY, played INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, goals_for INTEGER NOT NULL DEFAULT 0, goals_against INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, actor TEXT NOT NULL, target TEXT, details TEXT, created_at TEXT NOT NULL);
'''

def now(): return datetime.now(timezone.utc).isoformat()

def _conn():
    if DATABASE_URL:
        import psycopg
        return psycopg.connect(DATABASE_URL, autocommit=False)
    c = sqlite3.connect(os.getenv('SQLITE_PATH','efootball.db'), check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c

def _sql(q): return q.replace('?', '%s') if DATABASE_URL else q

def init():
    with _conn() as c:
        for stmt in SCHEMA.split(';'):
            if stmt.strip(): c.execute(_sql(stmt))
        c.commit()

def rows(q, args=()):
    with _conn() as c:
        cur=c.cursor(); cur.execute(_sql(q), args); out=cur.fetchall()
        return [dict(r) if isinstance(r, sqlite3.Row) else dict(zip([d.name for d in cur.description],r)) for r in out]

def one(q,args=()):
    r=rows(q,args); return r[0] if r else None

def exec(q,args=()):
    with _conn() as c:
        cur=c.cursor(); cur.execute(_sql(q),args); c.commit(); return cur.rowcount

def create_tournament(name):
    tid='EC-'+secrets.token_hex(3).upper()
    exec('INSERT INTO tournaments VALUES(?,?,?,?,?)',(tid,name,'OPEN',None,now()))
    return get_tournament(tid)

def get_tournament(tid):
    t=one('SELECT * FROM tournaments WHERE id=?',(tid,))
    if not t:return None
    t['players']=rows('SELECT p.id,p.display_name,p.efootball_username FROM players p JOIN tournament_players tp ON tp.player_id=p.id WHERE tp.tournament_id=? ORDER BY tp.joined_at',(tid,))
    t['max_players']=8; t['bracket_generated']=bool(one('SELECT 1 AS x FROM matches WHERE tournament_id=? LIMIT 1',(tid,)))
    return t

def list_tournaments(): return [dict(t, players=rows('SELECT p.id,p.display_name,p.efootball_username FROM players p JOIN tournament_players tp ON tp.player_id=p.id WHERE tp.tournament_id=? ORDER BY tp.joined_at',(t['id'],)), max_players=8) for t in rows('SELECT * FROM tournaments ORDER BY created_at DESC')]

def register(tid,name,ef):
    t=get_tournament(tid)
    if not t:return None,'TOURNAMENT_NOT_FOUND'
    if t['status']!='OPEN':return None,'REGISTRATION_CLOSED'
    if len(t['players'])>=8:return None,'TOURNAMENT_FULL'
    pid='P-'+secrets.token_hex(4).upper(); token=secrets.token_urlsafe(32)
    try:
        with _conn() as c:
            cur=c.cursor(); cur.execute(_sql('INSERT INTO players VALUES(?,?,?,?,?)'),(pid,name,ef,token,now())); cur.execute(_sql('INSERT INTO tournament_players VALUES(?,?,?)'),(tid,pid,now()))
            count=cur.execute(_sql('SELECT COUNT(*) FROM tournament_players WHERE tournament_id=?'),(tid,)).fetchone()[0]
            if count==8:cur.execute(_sql("UPDATE tournaments SET status='FULL' WHERE id=?"),(tid,))
            c.commit()
    except Exception as e:
        return None,'ALREADY_REGISTERED' if 'unique' in str(e).lower() else 'REGISTRATION_ERROR'
    return {'player':{'id':pid,'display_name':name,'efootball_username':ef,'token':token},'tournament':get_tournament(tid)},None

def auth_player(token): return one('SELECT * FROM players WHERE token=?',(token,))

def auth_admin(key): return bool(os.getenv('ADMIN_KEY')) and secrets.compare_digest(key or '',os.getenv('ADMIN_KEY'))

def generate_bracket(tid):
    t=get_tournament(tid)
    if not t: raise ValueError('Tournament not found')
    if len(t['players'])!=8: raise ValueError('Tournament must have exactly 8 players')
    if t['bracket_generated']: return t
    ids=[p['id'] for p in t['players']]; pairs=[(ids[0],ids[7]),(ids[3],ids[4]),(ids[1],ids[6]),(ids[2],ids[5])]
    with _conn() as c:
        cur=c.cursor()
        for i,(a,b) in enumerate(pairs,1):cur.execute(_sql('INSERT INTO matches VALUES(?,?,?,?,?,?,?,?,?,?,?)'),(f'{tid}-QF{i}',tid,'QF',i,a,b,None,None,None,'READY',now()))
        cur.execute(_sql("UPDATE tournaments SET status='LOCKED' WHERE id=?"),(tid,)); c.commit()
    return get_tournament(tid)

def attach_code(tid,code):
    if not get_tournament(tid):return None
    exec("UPDATE tournaments SET efootball_id=?,status='IN_PROGRESS' WHERE id=?",(code.strip(),tid)); return get_tournament(tid)

def get_matches(tid): return rows('SELECT * FROM matches WHERE tournament_id=? ORDER BY round,slot',(tid,))

def submit(match_id,player,sa,sb,evidence,note):
    m=one('SELECT * FROM matches WHERE id=?',(match_id,))
    if not m:return None,'MATCH_NOT_FOUND'
    if player not in (m['player_a'],m['player_b']):return None,'NOT_A_PLAYER'
    if m['status'] in ('CONFIRMED','CANCELLED'):return None,'MATCH_CLOSED'
    sid='S-'+secrets.token_hex(5).upper(); exec('INSERT INTO submissions VALUES(?,?,?,?,?,?,?,?,?)',(sid,match_id,player,sa,sb,evidence,note,'PENDING',now())); exec("UPDATE matches SET status='UNDER_REVIEW' WHERE id=?",(match_id,)); return one('SELECT * FROM submissions WHERE id=?',(sid,)),None

def confirm(sub_id):
    s=one('SELECT * FROM submissions WHERE id=?',(sub_id,));
    if not s:return None,'SUBMISSION_NOT_FOUND'
    m=one('SELECT * FROM matches WHERE id=?',(s['match_id'],));
    if not m:return None,'MATCH_NOT_FOUND'
    winner=m['player_a'] if s['score_a']>s['score_b'] else m['player_b'] if s['score_b']>s['score_a'] else None
    if winner is None:return None,'DRAW_NOT_ALLOWED'
    exec("UPDATE submissions SET status='CONFIRMED' WHERE id=?",(sub_id,)); exec("UPDATE matches SET score_a=?,score_b=?,winner=?,status='CONFIRMED' WHERE id=?",(s['score_a'],s['score_b'],winner,m['id']))
    update_stats(m,s,winner); advance(m,winner); return one('SELECT * FROM matches WHERE id=?',(m['id'],)),None

def update_stats(m,s,w):
    for pid,sc,opp in ((m['player_a'],s['score_a'],s['score_b']),(m['player_b'],s['score_b'],s['score_a'])):
        exec("INSERT INTO stats(player_id,played,wins,losses,goals_for,goals_against,points) VALUES(?,?,?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET played=stats.played+1,wins=stats.wins+?,losses=stats.losses+?,goals_for=stats.goals_for+?,goals_against=stats.goals_against+?,points=stats.points+?",(pid,1,int(pid==w),int(pid!=w),sc,opp,3 if pid==w else 0,int(pid==w),int(pid!=w),sc,opp,3 if pid==w else 0))

def advance(m,w):
    if m['round']=='FINAL': exec("UPDATE tournaments SET status='COMPLETED' WHERE id=?",(m['tournament_id'],)); return
    next_round={'QF':'SF','SF':'FINAL'}[m['round']]; next_slot=(m['slot']+1)//2 if m['round']=='QF' else 1; mid=f"{m['tournament_id']}-{next_round}{next_slot}"
    nxt=one('SELECT * FROM matches WHERE id=?',(mid,))
    if not nxt:
        exec('INSERT INTO matches VALUES(?,?,?,?,?,?,?,?,?,?,?)',(mid,m['tournament_id'],next_round,next_slot,None,None,None,None,None,'SCHEDULED',now())); nxt=one('SELECT * FROM matches WHERE id=?',(mid,))
    col='player_a' if (m['slot']%2)==1 else 'player_b'; exec(f'UPDATE matches SET {col}=? WHERE id=?',(w,mid))
    n=one('SELECT * FROM matches WHERE id=?',(mid,));
    if n['player_a'] and n['player_b']:exec("UPDATE matches SET status='READY' WHERE id=?",(mid,))

def leaderboard(): return rows('SELECT p.id,p.display_name,p.efootball_username,COALESCE(s.played,0) played,COALESCE(s.wins,0) wins,COALESCE(s.losses,0) losses,COALESCE(s.goals_for,0) goals_for,COALESCE(s.goals_against,0) goals_against,COALESCE(s.points,0) points FROM players p LEFT JOIN stats s ON s.player_id=p.id ORDER BY points DESC,wins DESC,goals_for DESC')

def create_dispute(match_id,player,reason):
    did='D-'+secrets.token_hex(5).upper(); exec('INSERT INTO disputes VALUES(?,?,?,?,?,?)',(did,match_id,player,reason,'OPEN',now())); exec("UPDATE matches SET status='DISPUTED' WHERE id=?",(match_id,)); return one('SELECT * FROM disputes WHERE id=?',(did,))

def audit(action,actor,target=None,details=None): exec('INSERT INTO audit_logs VALUES(?,?,?,?,?,?)',('A-'+secrets.token_hex(5),action,actor,target,json.dumps(details or {}),now()))
