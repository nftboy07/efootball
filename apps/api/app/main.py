import os
import time
import uuid
import hashlib
import json
from fastapi import FastAPI, HTTPException, Header, Request, UploadFile, File
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from . import db

ENV=os.getenv('ENVIRONMENT','development').lower()
SENTRY_DSN=os.getenv('SENTRY_DSN','').strip()
if SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=1.0, environment=ENV)
    except Exception as e:
        print(f'Sentry initialization warning: {e}')

REDIS_URL=os.getenv('REDIS_URL','').strip()
redis_client=None
if REDIS_URL:
    try:
        import redis
        redis_client=redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=3)
    except Exception as e:
        print(f'Redis connection warning: {e}')
        redis_client=None

CLOUDINARY_URL=os.getenv('CLOUDINARY_URL','').strip()
if CLOUDINARY_URL:
    try:
        import cloudinary
        cloudinary.config(cloudinary_url=CLOUDINARY_URL)
    except Exception as e:
        print(f'Cloudinary configuration warning: {e}')

app=FastAPI(title='eFootball Community Tournament Platform',version='1.1.0')
class RequestSafetyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self,request,call_next):
        request_id=request.headers.get('X-Request-ID') or str(uuid.uuid4())
        content_length=request.headers.get('content-length')
        if content_length and content_length.isdigit() and int(content_length)>10*1024*1024:
            response=JSONResponse({'detail':'Request body too large'},status_code=413)
        else:
            response=await call_next(request)
        response.headers['X-Request-ID']=request_id
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['X-Frame-Options']='DENY'
        response.headers['Referrer-Policy']='strict-origin-when-cross-origin'
        return response
app.add_middleware(RequestSafetyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

class TournamentCreate(BaseModel):
    name:str=Field(min_length=2,max_length=100)
    prize_pool:str|None=Field(default=None,max_length=80)
class PlayerCreate(BaseModel): display_name:str=Field(min_length=2,max_length=40); efootball_username:str=Field(min_length=1,max_length=60)
class EfootballCode(BaseModel): tournament_id:str=Field(min_length=1,max_length=100)
class PrizePoolUpdate(BaseModel): prize_pool:str=Field(min_length=1,max_length=80)
class ResultCreate(BaseModel):
    score_a:int=Field(ge=0,le=99)
    score_b:int=Field(ge=0,le=99)
    evidence_url:str|None=Field(default=None,max_length=1000)
    note:str|None=Field(default=None,max_length=500)

    @field_validator('evidence_url')
    @classmethod
    def validate_evidence(cls,value):
        if value and not value.startswith(('https://','http://')): raise ValueError('Evidence URL must use HTTP or HTTPS')
        return value
class DisputeCreate(BaseModel): reason:str=Field(min_length=5,max_length=1000)
class AnnouncementUpdate(BaseModel):
    active:bool=True
    message:str=Field(min_length=1,max_length=280)
    type:str=Field(default='INFO',max_length=32)
class ReelsQueueUpdate(BaseModel): queue:list=Field(default_factory=list)

@app.on_event('startup')
def startup():
    if ENV=='production' and (not os.getenv('DATABASE_URL') or not os.getenv('ADMIN_KEY')):
        raise RuntimeError('DATABASE_URL and ADMIN_KEY are required in production')
    db.init(); db.check_connection()

admin_failures={}
def admin(k):
    fingerprint=hashlib.sha256((k or 'missing').encode()).hexdigest()
    if redis_client:
        try:
            rkey=f'rl:admin:{fingerprint}'
            fails=int(redis_client.get(rkey) or 0)
            if fails>=5:raise HTTPException(429,'Too many failed admin attempts. Try again later.')
            if not db.auth_admin(k):
                p=redis_client.pipeline(); p.incr(rkey); p.expire(rkey,300); p.execute()
                raise HTTPException(401,'Admin authentication required')
            return
        except HTTPException:raise
        except Exception:pass
    now=time.monotonic(); recent=[stamp for stamp in admin_failures.get(fingerprint,[]) if now-stamp<300]
    if len(recent)>=5:raise HTTPException(429,'Too many failed admin attempts. Try again later.')
    if not db.auth_admin(k):
        recent.append(now); admin_failures[fingerprint]=recent
        raise HTTPException(401,'Admin authentication required')

def player(k):
    p=db.auth_player(k)
    if not p:raise HTTPException(401,'Invalid player token')
    return p

registration_attempts={}
def allow_registration(request):
    ip=request.client.host if request.client else 'unknown'
    if redis_client:
        try:
            rkey=f'rl:reg:{ip}'
            cnt=redis_client.incr(rkey)
            if cnt==1:redis_client.expire(rkey,60)
            if cnt>30:raise HTTPException(429,'Too many registration attempts. Try again shortly.')
            return
        except HTTPException:raise
        except Exception:pass
    now=time.monotonic(); recent=[stamp for stamp in registration_attempts.get(ip,[]) if now-stamp<60]
    if len(recent)>=30:raise HTTPException(429,'Too many registration attempts. Try again shortly.')
    recent.append(now); registration_attempts[ip]=recent

@app.get('/health')
def health():
    try:db.check_connection()
    except Exception:raise HTTPException(503,'Database unavailable')
    database='postgres' if os.getenv('DATABASE_URL') else 'local-sqlite'
    redis_ok=False
    if redis_client:
        try:redis_ok=bool(redis_client.ping())
        except Exception:redis_ok=False
    return {
        'status':'ok',
        'environment':ENV,
        'database':database,
        'durable_storage':database=='postgres',
        'redis':redis_ok,
        'cloudinary':bool(CLOUDINARY_URL),
        'sentry':bool(SENTRY_DSN)
    }

@app.post('/api/upload')
async def upload_evidence(file:UploadFile=File(...),x_player_token:str|None=Header(default=None),x_admin_key:str|None=Header(default=None)):
    if not x_player_token and not x_admin_key:
        raise HTTPException(401,'Authentication required')
    if x_player_token: player(x_player_token)
    elif x_admin_key: admin(x_admin_key)
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(400,'Only image files are supported (png, jpg, webp)')
    contents=await file.read()
    if len(contents)>5*1024*1024:
        raise HTTPException(413,'Image must be smaller than 5MB')
    if not CLOUDINARY_URL:
        raise HTTPException(503,'Image storage service not configured')
    try:
        import cloudinary.uploader
        res=cloudinary.uploader.upload(contents,folder='efootball/evidence',resource_type='image')
        return {'url':res.get('secure_url')}
    except Exception as e:
        raise HTTPException(500,f'Upload failed: {str(e)}')

@app.get('/ready')
def ready():
    try:db.check_connection()
    except Exception:raise HTTPException(503,'Database unavailable')
    return {'status':'ready'}
@app.get('/version')
def version():return {'service':'efootball-tournament-api','version':app.version,'environment':ENV}
@app.get('/api/tournaments')
def tournaments():return db.list_tournaments()
@app.get('/api/tournaments/{tid}')
def tournament(tid):
    t=db.get_tournament(tid)
    if not t:raise HTTPException(404,'Tournament not found')
    return t
@app.get('/api/admin/verify')
def verify_admin(x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); return {'ok':True}

@app.post('/api/admin/tournaments')
def create_tournament(data:TournamentCreate,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key); t=db.create_tournament(data.name,data.prize_pool); db.audit('TOURNAMENT_CREATED','admin',t['id'],{'name':data.name}); return t

@app.post('/api/admin/tournaments/{tid}/prize')
def set_prize(tid:str,data:PrizePoolUpdate,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key)
    t=db.set_prize_pool(tid,data.prize_pool)
    if not t: raise HTTPException(404,'Tournament not found')
    db.audit('PRIZE_POOL_UPDATED','admin',tid,{'prize_pool':data.prize_pool})
    return t

@app.post('/api/admin/tournaments/{tid}/players/{pid}/kick')
def kick(tid:str,pid:str,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key)
    out,error=db.kick_player(tid,pid)
    if error: raise HTTPException(404 if error=='TOURNAMENT_NOT_FOUND' else 400, error)
    db.audit('PLAYER_KICKED','admin',tid,{'player_id':pid})
    return out

@app.post('/api/admin/matches/{match_id}/result')
def admin_result(match_id:str,data:ResultCreate,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key)
    out,error=db.admin_report(match_id,data.score_a,data.score_b,data.evidence_url,data.note)
    if error: raise HTTPException(404 if error=='MATCH_NOT_FOUND' else 400, error)
    db.audit('ADMIN_RESULT_REPORTED','admin',match_id,{'score_a':data.score_a,'score_b':data.score_b})
    return out

@app.get('/api/announcement')
def get_announcement():
    raw=db.kv_get('announcement')
    if not raw: return {'active':False,'message':'','type':'INFO','updated_at':None}
    try: return json.loads(raw)
    except Exception: return {'active':False,'message':'','type':'INFO'}

@app.put('/api/announcement')
def put_announcement(data:AnnouncementUpdate,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key)
    payload={'active':data.active,'message':data.message,'type':data.type,'updatedAt':db.now()}
    db.kv_set('announcement', json.dumps(payload))
    db.audit('ANNOUNCEMENT_UPDATED','admin','announcement',payload)
    return payload

@app.get('/api/reels-queue')
def get_reels_queue():
    raw=db.kv_get('reels_queue')
    try: queue=json.loads(raw) if raw else []
    except Exception: queue=[]
    if not isinstance(queue,list): queue=[]
    return {'queue':queue,'totalQueued':len([r for r in queue if isinstance(r,dict) and r.get('status')=='QUEUED']),'totalPublished':len([r for r in queue if isinstance(r,dict) and r.get('status')=='PUBLISHED'])}

@app.put('/api/reels-queue')
def put_reels_queue(data:ReelsQueueUpdate,x_admin_key:str|None=Header(default=None)):
    admin(x_admin_key)
    queue=data.queue if isinstance(data.queue,list) else []
    if len(queue)>100: raise HTTPException(400,'Queue too large')
    db.kv_set('reels_queue', json.dumps(queue))
    db.audit('REELS_QUEUE_UPDATED','admin','reels_queue',{'count':len(queue)})
    return {'success':True,'queue':queue}
@app.post('/api/tournaments/{tid}/players')
def register(tid:str,data:PlayerCreate,request:Request):
    allow_registration(request)
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
