import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from . import db

ENV=os.getenv('ENVIRONMENT','development').lower()
app=FastAPI(title='eFootball Community Tournament Platform',version='1.1.0')
origins={'https://efootball2026.online','https://www.efootball2026.online'}
origins.update(x.strip() for x in os.getenv('CORS_ORIGINS','').split(',') if x.strip())
app.add_middleware(CORSMiddleware,allow_origins=sorted(origins),allow_credentials=False,allow_methods=['GET','POST','OPTIONS'],allow_headers=['Content-Type','X-Player-Token','X-Admin-Key'])

class TournamentCreate(BaseModel): name:str=Field(min_length=2,max_length=100)
class PlayerCreate(BaseModel): display_name:str=Field(min_length=2,max_length=40); efootball_username:str=Field(min_length=1,max_length=60)
class EfootballCode(BaseModel): tournament_id:str=Field(min_length=1,max_length=100)
class ResultCreate(BaseModel): score_a:int=Field(ge=0,le=99); score_b:int=Field(ge=0,le=99); evidence_url:str|None=Field(default=None,max_length=1000); note:str|None=Field(default=None,max_length=500)
class DisputeCreate(BaseModel): reason:str=Field(min_length=5,max_length=1000)

@app.on_event('startup')
def startup():
    if ENV=='production' and (not os.getenv('DATABASE_URL') or not os.getenv('ADMIN_KEY')):
        raise RuntimeError('DATABASE_URL and ADMIN_KEY are required in production')
    db.init(); db.check_connection()

def admin(k):
    if not db.auth_admin(k):raise HTTPException(401,'Admin authentication required')
def player(k):
    p=db.auth_player(k)
    if not p:raise HTTPException(401,'Invalid player token')
    return p

@app.get('/health')
def health():
    try:db.check_connection()
    except Exception:raise HTTPException(503,'Database unavailable')
    return {'status':'ok','environment':ENV,'database':'postgres' if os.getenv('DATABASE_URL') else 'local-sqlite'}
@app.get('/api/tournaments')
def tournaments():return db.list_tournaments()
@app.get('/api/tournaments/{tid}')
def tournament(tid):
    t=db.get_tournament(tid)
    if not t:raise HTTPException(404,'Tournament not found')
    return t
@app.post('/api/admin/tournaments')
def create_tournament(data:TournamentCreate,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); t=db.create_tournament(data.name); db.audit('TOURNAMENT_CREATED','admin',t['id'],{'name':data.name}); return t
@app.post('/api/tournaments/{tid}/players')
def register(tid:str,data:PlayerCreate):
    result,error=db.register(tid,data.display_name,data.efootball_username)
    if error:raise HTTPException(404 if error=='TOURNAMENT_NOT_FOUND' else 409,error)
    db.audit('PLAYER_REGISTERED',result['player']['id'],tid,{}); return result
@app.get('/api/player/me')
def me(x_player_token:str|None=Header(default=None)):return player(x_player_token)
@app.post('/api/admin/tournaments/{tid}/bracket')
def bracket(tid:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key)
    try:out=db.generate_bracket(tid)
    except ValueError as e:raise HTTPException(400,str(e))
    db.audit('BRACKET_GENERATED','admin',tid,{}); return out
@app.post('/api/admin/tournaments/{tid}/efootball-id')
def efootball_id(tid:str,data:EfootballCode,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); t=db.get_tournament(tid)
    if not t:raise HTTPException(404,'Tournament not found')
    if len(t['players'])!=8 or not t['bracket_generated']:raise HTTPException(400,'Tournament must have 8 players and a generated bracket')
    out=db.attach_code(tid,data.tournament_id); db.audit('EFOOTBALL_ID_ATTACHED','admin',tid,{'efootball_id':data.tournament_id}); return out
@app.get('/api/tournaments/{tid}/matches')
def matches(tid):return db.get_matches(tid)
@app.post('/api/matches/{match_id}/result')
def result(match_id:str,data:ResultCreate,x_player_token:str|None=Header(default=None)):
    p=player(x_player_token); out,error=db.submit(match_id,p['id'],data.score_a,data.score_b,data.evidence_url,data.note)
    if error:raise HTTPException(404 if error=='MATCH_NOT_FOUND' else 409,error)
    db.audit('RESULT_SUBMITTED',p['id'],match_id,{'score_a':data.score_a,'score_b':data.score_b}); return out
@app.post('/api/matches/{match_id}/dispute')
def dispute(match_id:str,data:DisputeCreate,x_player_token:str|None=Header(default=None)):
    p=player(x_player_token); m=db.one('SELECT * FROM matches WHERE id=?',(match_id,))
    if not m:raise HTTPException(404,'Match not found')
    if p['id'] not in (m['player_a'],m['player_b']):raise HTTPException(403,'Not a match participant')
    return db.create_dispute(match_id,p['id'],data.reason)
@app.get('/api/admin/submissions')
def submissions(x_admin_key:str|None=Header(default=None)):admin(x_admin_key); return db.rows("SELECT * FROM submissions WHERE status='PENDING' ORDER BY created_at")
@app.post('/api/admin/submissions/{submission_id}/confirm')
def confirm(submission_id:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); out,error=db.confirm(submission_id)
    if error:raise HTTPException(400,error)
    db.audit('RESULT_CONFIRMED','admin',submission_id,{}); return out
@app.get('/api/leaderboard')
def leaderboard():return db.leaderboard()
@app.get('/api/admin/disputes')
def disputes(x_admin_key:str|None=Header(default=None)):admin(x_admin_key); return db.rows("SELECT * FROM disputes WHERE status='OPEN' ORDER BY created_at")
@app.post('/api/admin/disputes/{dispute_id}/resolve')
def resolve_dispute(dispute_id:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); d=db.one('SELECT * FROM disputes WHERE id=?',(dispute_id,))
    if not d:raise HTTPException(404,'Dispute not found')
    db.exec("UPDATE disputes SET status='RESOLVED' WHERE id=?",(dispute_id,)); db.audit('DISPUTE_RESOLVED','admin',dispute_id,{}); return {'status':'RESOLVED','id':dispute_id}
@app.post('/api/admin/matches/{match_id}/forfeit/{player_id}')
def forfeit(match_id:str,player_id:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); m=db.one('SELECT * FROM matches WHERE id=?',(match_id,))
    if not m:raise HTTPException(404,'Match not found')
    if player_id not in (m['player_a'],m['player_b']):raise HTTPException(400,'Player is not in match')
    winner=m['player_b'] if player_id==m['player_a'] else m['player_a']; db.exec("UPDATE matches SET winner=?,status='FORFEIT' WHERE id=?",(winner,match_id)); db.advance(m,winner); db.audit('FORFEIT','admin',match_id,{'winner':winner,'forfeit':player_id}); return db.one('SELECT * FROM matches WHERE id=?',(match_id,))
