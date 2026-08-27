from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from .store import tournaments, users, matches, create_tournament, join_tournament, generate_bracket

app = FastAPI(title='eFootball Community Tournament API', version='0.3.0')

class TournamentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)

class PlayerCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=40)
    efootball_username: str = Field(min_length=1, max_length=60)

class EfootballCode(BaseModel):
    tournament_id: str = Field(min_length=1, max_length=100)

@app.get('/', response_class=HTMLResponse)
def home():
    return HTMLResponse('''<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>eFootball Tournaments</title><style>body{font-family:system-ui;margin:0;background:#0b1020;color:#fff}main{max-width:760px;margin:auto;padding:28px 18px}section{background:#151d35;padding:20px;border-radius:16px;margin:16px 0}input,button{width:100%;box-sizing:border-box;padding:13px;margin:7px 0;border-radius:10px;border:1px solid #33405f}input{background:#0d1428;color:#fff}button{background:#fff;color:#0b1020;font-weight:700;cursor:pointer}.muted{color:#aab5d0}.card{border:1px solid #2d3857;border-radius:12px;padding:14px;margin:10px 0}.ok{color:#7ee787}.err{color:#ff8b8b}</style></head><body><main><h1>⚽ eFootball Community Tournaments</h1><p class="muted">Free-entry community tournaments. Join a tournament and enter your eFootball username.</p><section><h2>Join tournament</h2><input id="tid" placeholder="Tournament ID e.g. EC-000001"><input id="name" placeholder="Your display name"><input id="ef" placeholder="Your eFootball username"><button onclick="join()">Enter Tournament</button><p id="joinmsg"></p></section><section><h2>Open tournaments</h2><div id="list">Loading...</div></section><section><h2>Admin quick create</h2><input id="tname" placeholder="Tournament name"><button onclick="create()">Create Tournament</button><p class="muted">Prototype only: admin endpoints are not authenticated yet.</p><p id="createmsg"></p></section></main><script>async function load(){const r=await fetch('/api/tournaments');const ts=await r.json();document.querySelector('#list').innerHTML=ts.length?ts.map(t=>`<div class="card"><b>${esc(t.name)}</b><br><span class="muted">${t.id} · ${t.players.length}/8 · ${t.status}</span></div>`).join(''):'<p class="muted">No tournaments yet.</p>'}async function join(){const tid=document.querySelector('#tid').value.trim(),display_name=document.querySelector('#name').value.trim(),efootball_username=document.querySelector('#ef').value.trim(),m=document.querySelector('#joinmsg');try{const r=await fetch('/api/tournaments/'+encodeURIComponent(tid)+'/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({display_name,efootball_username})});const d=await r.json();if(!r.ok)throw new Error(d.detail||'Unable to join');m.className='ok';m.textContent='Joined '+d.tournament.id+' successfully!';load()}catch(e){m.className='err';m.textContent=e.message}}async function create(){const name=document.querySelector('#tname').value.trim(),m=document.querySelector('#createmsg');const r=await fetch('/api/admin/tournaments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});const d=await r.json();if(!r.ok){m.className='err';m.textContent=d.detail||'Unable to create';return}m.className='ok';m.textContent='Created '+d.id;document.querySelector('#tid').value=d.id;load()}function esc(s){return s.replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}load();</script></body></html>''')

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.get('/api/tournaments')
def list_tournaments():
    return list(tournaments.values())

@app.get('/api/tournaments/{tid}')
def get_tournament(tid: str):
    t = tournaments.get(tid)
    if not t: raise HTTPException(404, 'Tournament not found')
    return t

@app.post('/api/admin/tournaments')
def admin_create_tournament(data: TournamentCreate):
    return create_tournament(data.name)

@app.post('/api/tournaments/{tid}/players')
def register_player(tid: str, data: PlayerCreate):
    uid = f'P-{len(users)+1:06d}'
    users[uid] = {'id': uid, **data.model_dump()}
    tournament, error = join_tournament(tid, uid)
    if error:
        users.pop(uid, None)
        status = 409 if error in ('TOURNAMENT_FULL', 'ALREADY_REGISTERED', 'REGISTRATION_CLOSED') else 404
        raise HTTPException(status, error)
    return {'player': users[uid], 'tournament': tournament}

@app.post('/api/admin/tournaments/{tid}/bracket')
def admin_generate_bracket(tid: str):
    try:
        return generate_bracket(tid)
    except KeyError:
        raise HTTPException(404, 'Tournament not found')
    except ValueError as exc:
        raise HTTPException(400, str(exc))

@app.post('/api/admin/tournaments/{tid}/efootball-id')
def admin_attach_efootball_id(tid: str, data: EfootballCode):
    t = tournaments.get(tid)
    if not t: raise HTTPException(404, 'Tournament not found')
    if len(t['players']) != 8: raise HTTPException(400, 'Exactly 8 players are required')
    if not t['bracket_generated']: raise HTTPException(400, 'Generate the bracket first')
    if not data.tournament_id.strip(): raise HTTPException(400, 'eFootball Tournament ID is required')
    t['efootball_tournament_id'] = data.tournament_id.strip()
    t['status'] = 'IN_PROGRESS'
    return t

@app.get('/api/tournaments/{tid}/matches')
def get_matches(tid: str):
    return [m for m in matches.values() if m['tournament_id'] == tid]
