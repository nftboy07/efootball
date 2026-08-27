import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from . import db

app = FastAPI(title='eFootball Community Tournament Platform', version='1.0.0')
class TournamentCreate(BaseModel): name:str=Field(min_length=2,max_length=100)
class PlayerCreate(BaseModel): display_name:str=Field(min_length=2,max_length=40); efootball_username:str=Field(min_length=1,max_length=60)
class EfootballCode(BaseModel): tournament_id:str=Field(min_length=1,max_length=100)
class ResultCreate(BaseModel): score_a:int=Field(ge=0,le=99); score_b:int=Field(ge=0,le=99); evidence_url:str|None=Field(default=None,max_length=1000); note:str|None=Field(default=None,max_length=500)
class DisputeCreate(BaseModel): reason:str=Field(min_length=5,max_length=1000)
@app.on_event('startup')
def startup(): db.init()
def admin(k):
    if not db.auth_admin(k): raise HTTPException(401,'Admin authentication required')
def player(k):
    p=db.auth_player(k)
    if not p: raise HTTPException(401,'Invalid player token')
    return p
@app.get('/health')
def health(): return {'status':'ok','database':'postgres' if os.getenv('DATABASE_URL') else 'local-sqlite'}
@app.get('/api/tournaments')
def tournaments(): return db.list_tournaments()
@app.get('/api/tournaments/{tid}')
def tournament(tid):
    t=db.get_tournament(tid)
    if not t: raise HTTPException(404,'Tournament not found')
    return t
@app.post('/api/admin/tournaments')
def create_tournament(data:TournamentCreate,x_admin_key:str|None=Header(default=None)): admin(x_admin_key); t=db.create_tournament(data.name); db.audit('TOURNAMENT_CREATED','admin',t['id'],{'name':data.name}); return t
@app.post('/api/tournaments/{tid}/players')
def register(tid:str,data:PlayerCreate):
    result,error=db.register(tid,data.display_name,data.efootball_username)
    if error: raise HTTPException(409 if error!='TOURNAMENT_NOT_FOUND' else 404,error)
    db.audit('PLAYER_REGISTERED',result['player']['id'],tid,{}); return result
@app.get('/api/player/me')
def me(x_player_token:str|None=Header(default=None)): return player(x_player_token)
@app.post('/api/admin/tournaments/{tid}/bracket')
def bracket(tid:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key)
    try: out=db.generate_bracket(tid)
    except ValueError as e: raise HTTPException(400,str(e))
    db.audit('BRACKET_GENERATED','admin',tid,{}); return out
@app.post('/api/admin/tournaments/{tid}/efootball-id')
def efootball_id(tid:str,data:EfootballCode,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); t=db.get_tournament(tid)
    if not t: raise HTTPException(404,'Tournament not found')
    if len(t['players'])!=8 or not t['bracket_generated']: raise HTTPException(400,'Tournament must have 8 players and a generated bracket')
    if not data.tournament_id.strip(): raise HTTPException(400,'eFootball Tournament ID is required')
    out=db.attach_code(tid,data.tournament_id); db.audit('EFOOTBALL_ID_ATTACHED','admin',tid,{'efootball_id':data.tournament_id}); return out
@app.get('/api/tournaments/{tid}/matches')
def matches(tid): return db.get_matches(tid)
@app.post('/api/matches/{match_id}/result')
def result(match_id:str,data:ResultCreate,x_player_token:str|None=Header(default=None)):
    p=player(x_player_token); out,error=db.submit(match_id,p['id'],data.score_a,data.score_b,data.evidence_url,data.note)
    if error: raise HTTPException(409 if error!='MATCH_NOT_FOUND' else 404,error)
    db.audit('RESULT_SUBMITTED',p['id'],match_id,{'score_a':data.score_a,'score_b':data.score_b}); return out
@app.post('/api/matches/{match_id}/dispute')
def dispute(match_id:str,data:DisputeCreate,x_player_token:str|None=Header(default=None)):
    p=player(x_player_token); m=db.one('SELECT * FROM matches WHERE id=?',(match_id,))
    if not m: raise HTTPException(404,'Match not found')
    if p['id'] not in (m['player_a'],m['player_b']): raise HTTPException(403,'Not a match participant')
    return db.create_dispute(match_id,p['id'],data.reason)
@app.get('/api/admin/submissions')
def submissions(x_admin_key:str|None=Header(default=None)): admin(x_admin_key); return db.rows("SELECT * FROM submissions WHERE status='PENDING' ORDER BY created_at")
@app.post('/api/admin/submissions/{submission_id}/confirm')
def confirm(submission_id:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); out,error=db.confirm(submission_id)
    if error: raise HTTPException(400,error)
    db.audit('RESULT_CONFIRMED','admin',submission_id,{}); return out
@app.get('/api/leaderboard')
def leaderboard(): return db.leaderboard()
@app.get('/api/admin/disputes')
def disputes(x_admin_key:str|None=Header(default=None)): admin(x_admin_key); return db.rows("SELECT * FROM disputes WHERE status='OPEN' ORDER BY created_at")
@app.post('/api/admin/disputes/{dispute_id}/resolve')
def resolve_dispute(dispute_id:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); d=db.one('SELECT * FROM disputes WHERE id=?',(dispute_id,))
    if not d: raise HTTPException(404,'Dispute not found')
    db.exec("UPDATE disputes SET status='RESOLVED' WHERE id=?",(dispute_id,)); db.audit('DISPUTE_RESOLVED','admin',dispute_id,{}); return {'status':'RESOLVED','id':dispute_id}
@app.post('/api/admin/matches/{match_id}/forfeit/{player_id}')
def forfeit(match_id:str,player_id:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); m=db.one('SELECT * FROM matches WHERE id=?',(match_id,))
    if not m: raise HTTPException(404,'Match not found')
    if player_id not in (m['player_a'],m['player_b']): raise HTTPException(400,'Player is not in match')
    winner=m['player_b'] if player_id==m['player_a'] else m['player_a']; db.exec("UPDATE matches SET winner=?,status='FORFEIT' WHERE id=?",(winner,match_id)); db.advance(m,winner); db.audit('FORFEIT','admin',match_id,{'winner':winner,'forfeit':player_id}); return db.one('SELECT * FROM matches WHERE id=?',(match_id,))
@app.get('/',response_class=HTMLResponse)
def home():
    return HTMLResponse('''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>eFootball Tournaments</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:#07111f;color:#fff}main{max-width:850px;margin:auto;padding:24px 16px}h1{font-size:34px}section,.card{background:#101d31;border:1px solid #20324d;border-radius:18px;padding:18px;margin:14px 0}input,button{width:100%;padding:13px;margin:6px 0;border-radius:11px;border:1px solid #314665}input{background:#081322;color:white}button{background:#fff;color:#07111f;font-weight:800}.muted{color:#91a4be}.ok{color:#62e6a5}.err{color:#ff7d7d}.pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#1a3150}</style></head><body><main><h1>⚽ eFootball Community Tournaments</h1><p class="muted">Free 8-player community tournaments. Enter the tournament ID, join, play in eFootball, then submit your score and evidence.</p><section><h2>Join a tournament</h2><input id="tid" placeholder="EC-XXXXXX"><input id="name" placeholder="Display name"><input id="ef" placeholder="eFootball username"><button onclick="join()">ENTER TOURNAMENT</button><p id="msg"></p></section><section><h2>Open tournaments</h2><div id="list">Loading…</div></section><section><h2>My player token</h2><p class="muted">Your token is private and is stored on this device.</p><input id="token" readonly><button onclick="navigator.clipboard.writeText(document.querySelector('#token').value)">COPY TOKEN</button></section></main><script>const $=x=>document.querySelector(x);async function load(){let r=await fetch('/api/tournaments'),ts=await r.json();$('#list').innerHTML=ts.length?ts.map(t=>`<div class="card"><b>${esc(t.name)}</b><br><span class="pill">${t.id}</span> <span class="muted">${t.players.length}/8 · ${t.status}</span></div>`).join(''):'<p class="muted">No tournaments yet.</p>'}async function join(){let m=$('#msg');try{let r=await fetch('/api/tournaments/'+encodeURIComponent($('#tid').value.trim())+'/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({display_name:$('#name').value.trim(),efootball_username:$('#ef').value.trim()})});let d=await r.json();if(!r.ok)throw Error(d.detail||'Could not join');localStorage.setItem('player_token',d.player.token);$('#token').value=d.player.token;m.className='ok';m.textContent='Joined '+d.tournament.id+'! Save your token.';load()}catch(e){m.className='err';m.textContent=e.message}}function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}$('#token').value=localStorage.getItem('player_token')||'';load()</script></body></html>''')
