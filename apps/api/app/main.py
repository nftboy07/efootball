from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from .store import tournaments, users, matches, create_tournament, join_tournament, generate_bracket

app = FastAPI(title='eFootball Community Tournament API', version='0.2.0')

class TournamentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)

class PlayerCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=40)
    efootball_username: str = Field(min_length=1, max_length=60)

class EfootballCode(BaseModel):
    tournament_id: str = Field(min_length=1, max_length=100)

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
