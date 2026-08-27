import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from . import db
app=FastAPI(title='eFootball Community Tournament Platform',version='1.0.0')
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
    return HTMLResponse(r'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>eFootball Community Tournaments</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:#07111f;color:#fff}main{max-width:920px;margin:auto;padding:20px 14px}h1{font-size:32px;margin-bottom:4px}section,.card{background:#101d31;border:1px solid #20324d;border-radius:18px;padding:16px;margin:12px 0}.grid{display:grid;gap:12px}@media(min-width:700px){.grid{grid-template-columns:1fr 1fr}}input,button,textarea{width:100%;padding:12px;margin:5px 0;border-radius:10px;border:1px solid #314665}input,textarea{background:#081322;color:#fff}button{background:#fff;color:#07111f;font-weight:800}.muted{color:#91a4be}.ok{color:#62e6a5}.err{color:#ff7d7d}.pill{display:inline-block;padding:3px 8px;border-radius:999px;background:#1a3150}.danger{background:#ff7d7d}.small{font-size:13px}</style></head><body><main><h1>⚽ eFootball Community Tournaments</h1><p class="muted">Free 8-player tournaments • manual eFootball Custom Tournament IDs • result evidence • verification • leaderboard</p><section><h2>Join tournament</h2><input id="tid" placeholder="Tournament ID"><input id="name" placeholder="Display name"><input id="ef" placeholder="eFootball username"><button onclick="join()">ENTER TOURNAMENT</button><p id="joinmsg"></p></section><section><h2>Open tournaments</h2><div id="list">Loading…</div></section><section><h2>My matches</h2><input id="mytid" placeholder="Tournament ID"><button onclick="loadMatches()">LOAD MATCHES</button><div id="matches"></div></section><section><h2>Submit result</h2><input id="mid" placeholder="Match ID"><input id="sa" type="number" min="0" max="99" placeholder="Your score / player A score"><input id="sb" type="number" min="0" max="99" placeholder="Opponent / player B score"><input id="evidence" placeholder="Screenshot URL (private storage URL) or evidence link"><textarea id="note" placeholder="Optional note"></textarea><button onclick="submitResult()">SUBMIT FOR VERIFICATION</button><p class="muted small">The admin must verify every result before the bracket advances.</p><p id="resultmsg"></p></section><section><h2>Leaderboard</h2><button onclick="loadBoard()">REFRESH LEADERBOARD</button><div id="board"></div></section><section><h2>Admin panel</h2><input id="akey" type="password" placeholder="ADMIN_KEY"><div class="grid"><div><input id="aname" placeholder="Tournament name"><button onclick="create()">CREATE TOURNAMENT</button></div><div><input id="atid" placeholder="Tournament ID"><button onclick="makeBracket()">GENERATE 8-PLAYER BRACKET</button></div></div><input id="efid" placeholder="Actual eFootball Custom Tournament ID"><button onclick="attachCode()">ACTIVATE TOURNAMENT</button><button onclick="loadPending()">LOAD PENDING RESULTS</button><div id="pending"></div><p id="adminmsg"></p></section><section><h2>Player token</h2><input id="token" readonly><button onclick="navigator.clipboard.writeText($('#token').value)">COPY TOKEN</button><p class="muted small">Keep this token private. It authorizes result submissions for this player.</p></section></main><script>const $=x=>document.querySelector(x);const tok=()=>localStorage.getItem('player_token')||'';function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}async function api(url,opt={}){opt.headers={...(opt.headers||{})};if(tok())opt.headers['X-Player-Token']=tok();let r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||'Request failed');return d}async function load(){let ts=await api('/api/tournaments');$('#list').innerHTML=ts.length?ts.map(t=>`<div class="card"><b>${esc(t.name)}</b><br><span class="pill">${esc(t.id)}</span> ${t.players.length}/8 · ${esc(t.status)}<br><span class="muted">${t.efootball_id?'Game ID: '+esc(t.efootball_id):'Waiting for admin activation'}</span></div>`).join(''):'<p class="muted">No tournaments yet.</p>'}async function join(){try{let d=await api('/api/tournaments/'+encodeURIComponent($('#tid').value.trim())+'/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({display_name:$('#name').value.trim(),efootball_username:$('#ef').value.trim()})});localStorage.setItem('player_token',d.player.token);$('#token').value=d.player.token;$('#mytid').value=d.tournament.id;$('#joinmsg').className='ok';$('#joinmsg').textContent='Joined '+d.tournament.id+' successfully!';load();loadMatches()}catch(e){$('#joinmsg').className='err';$('#joinmsg').textContent=e.message}}async function loadMatches(){try{let ms=await api('/api/tournaments/'+encodeURIComponent($('#mytid').value.trim())+'/matches');$('#matches').innerHTML=ms.length?ms.map(m=>`<div class="card"><b>${m.id}</b> · ${m.round} · ${m.status}<br>${esc(m.player_a)} vs ${esc(m.player_b)}<br>Score: ${m.score_a??'-'} : ${m.score_b??'-'}</div>`).join(''):'<p class="muted">No matches yet.</p>'}catch(e){$('#matches').textContent=e.message}}async function submitResult(){try{let d=await api('/api/matches/'+encodeURIComponent($('#mid').value.trim())+'/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({score_a:+$('#sa').value,score_b:+$('#sb').value,evidence_url:$('#evidence').value.trim()||null,note:$('#note').value.trim()||null})});$('#resultmsg').className='ok';$('#resultmsg').textContent='Result submitted for admin verification.'}catch(e){$('#resultmsg').className='err';$('#resultmsg').textContent=e.message}}function ah(){return {'X-Admin-Key':$('#akey').value}}async function create(){try{let r=await fetch('/api/admin/tournaments',{method:'POST',headers:{...ah(),'Content-Type':'application/json'},body:JSON.stringify({name:$('#aname').value.trim()})});let d=await r.json();if(!r.ok)throw Error(d.detail);$('#atid').value=d.id;$('#adminmsg').className='ok';$('#adminmsg').textContent='Created '+d.id;load()}catch(e){$('#adminmsg').className='err';$('#adminmsg').textContent=e.message}}async function makeBracket(){try{let r=await fetch('/api/admin/tournaments/'+encodeURIComponent($('#atid').value.trim())+'/bracket',{method:'POST',headers:ah()}),d=await r.json();if(!r.ok)throw Error(d.detail);$('#adminmsg').className='ok';$('#adminmsg').textContent='Bracket generated.';load()}catch(e){$('#adminmsg').className='err';$('#adminmsg').textContent=e.message}}async function attachCode(){try{let r=await fetch('/api/admin/tournaments/'+encodeURIComponent($('#atid').value.trim())+'/efootball-id',{method:'POST',headers:{...ah(),'Content-Type':'application/json'},body:JSON.stringify({tournament_id:$('#efid').value.trim()})}),d=await r.json();if(!r.ok)throw Error(d.detail);$('#adminmsg').className='ok';$('#adminmsg').textContent='Tournament activated with eFootball ID.';load()}catch(e){$('#adminmsg').className='err';$('#adminmsg').textContent=e.message}}async function loadPending(){try{let r=await fetch('/api/admin/submissions',{headers:ah()}),d=await r.json();if(!r.ok)throw Error(d.detail);$('#pending').innerHTML=d.length?d.map(s=>`<div class="card"><b>${s.id}</b><br>Match ${s.match_id} · ${s.score_a}:${s.score_b}<br>${esc(s.evidence_url||'No evidence URL')}<br><button onclick="confirmResult('${s.id}')">CONFIRM RESULT</button></div>`).join(''):'<p class="muted">No pending results.</p>'}catch(e){$('#pending').textContent=e.message}}async function confirmResult(id){let r=await fetch('/api/admin/submissions/'+id+'/confirm',{method:'POST',headers:ah()}),d=await r.json();if(!r.ok)alert(d.detail||'Failed');else{alert('Confirmed');loadPending();load();}}async function loadBoard(){let d=await api('/api/leaderboard');$('#board').innerHTML=d.map((p,i)=>`<div class="card"><b>#${i+1} ${esc(p.display_name)}</b> · ${p.points} pts · ${p.wins}W/${p.losses}L · ${p.goals_for} GF</div>`).join('')||'<p class="muted">No results yet.</p>'}$('#token').value=tok();load();loadBoard();</script></body></html>''')
