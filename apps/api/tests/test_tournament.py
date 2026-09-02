import os
import tempfile

os.environ['SQLITE_PATH']=tempfile.NamedTemporaryFile(suffix='.db',delete=False).name
os.environ['ENVIRONMENT']='development'
os.environ['ADMIN_KEY']='test-admin-secret'

from fastapi.testclient import TestClient
from app.main import app, registration_attempts
from app import db


def test_full_lifecycle():
    os.environ['ADMIN_KEY']='test-admin-secret'
    registration_attempts.clear()
    db.init()
    with TestClient(app) as client:
        admin={'X-Admin-Key':'test-admin-secret'}
        r=client.post('/api/admin/tournaments',headers=admin,json={'name':'Test Cup'})
        assert r.status_code==200
        tid=r.json()['id']
        tokens=[]
        for i in range(8):
            r=client.post(f'/api/tournaments/{tid}/players',json={'display_name':f'Player {i+1}','efootball_username':f'p{i+1}'})
            assert r.status_code==200
            tokens.append(r.json()['player']['token'])
        assert client.get(f'/api/tournaments/{tid}').json()['status']=='FULL'
        assert client.post(f'/api/tournaments/{tid}/players',json={'display_name':'Ninth','efootball_username':'p9'}).status_code==409
        assert client.post(f'/api/admin/tournaments/{tid}/bracket',headers=admin).status_code==200
        assert len(client.get(f'/api/tournaments/{tid}/matches').json())==4
        assert client.post(f'/api/admin/tournaments/{tid}/efootball-id',headers=admin,json={'tournament_id':'0004-6470-6202'}).status_code==200
        match=client.get(f'/api/tournaments/{tid}/matches').json()[0]
        assert client.post(f"/api/matches/{match['id']}/result",headers={'X-Player-Token':tokens[0]},json={'score_a':2,'score_b':1}).status_code==200
        pending=client.get('/api/admin/submissions',headers=admin).json()
        assert len(pending)==1
        assert client.post(f"/api/admin/submissions/{pending[0]['id']}/confirm",headers=admin).status_code==200
        health=client.get('/health').json()
        assert health['status']=='ok'
        assert health['durable_storage'] is False
        assert client.get('/ready').json()['status']=='ready'
        assert client.get('/version').json()['service']=='efootball-tournament-api'


def test_admin_verify_prize_queue_and_live_score():
    os.environ['ADMIN_KEY']='test-admin-secret'
    registration_attempts.clear()
    db.init()
    with TestClient(app) as client:
        admin={'X-Admin-Key':'test-admin-secret'}
        assert client.get('/api/admin/verify').status_code==401
        assert client.get('/api/admin/verify',headers=admin).status_code==200
        r=client.post('/api/admin/tournaments',headers=admin,json={'name':'Prize Cup','prize_pool':'Free entry'})
        assert r.status_code==200
        tid=r.json()['id']
        assert r.json().get('prize_pool')=='Free entry'
        assert client.post(f'/api/admin/tournaments/{tid}/prize',headers=admin,json={'prize_pool':'Community glory'}).status_code==200
        assert client.get(f'/api/tournaments/{tid}').json()['prize_pool']=='Community glory'

        p1=client.post(f'/api/tournaments/{tid}/players',json={'display_name':'Alpha','efootball_username':'alpha'}).json()
        pid=p1['player']['id']
        assert client.post(f'/api/admin/tournaments/{tid}/players/{pid}/kick',headers=admin).status_code==200
        assert client.get(f'/api/tournaments/{tid}').json()['players']==[]

        tokens=[]
        for i in range(8):
            r=client.post(f'/api/tournaments/{tid}/players',json={'display_name':f'P{i+1}','efootball_username':f'u{i+1}'})
            tokens.append(r.json()['player']['token'])
        assert client.post(f'/api/admin/tournaments/{tid}/bracket',headers=admin).status_code==200
        match=client.get(f'/api/tournaments/{tid}/matches').json()[0]
        assert match.get('player_a_name')
        assert client.post(f"/api/admin/matches/{match['id']}/result",headers=admin,json={'score_a':3,'score_b':3}).status_code==400
        reported=client.post(f"/api/admin/matches/{match['id']}/result",headers=admin,json={'score_a':3,'score_b':1,'evidence_url':'https://example.com/shot.png'})
        assert reported.status_code==200
        assert reported.json()['status']=='CONFIRMED'

        assert client.put('/api/announcement',json={'active':True,'message':'Cup is live'}).status_code==401
        saved=client.put('/api/announcement',headers=admin,json={'active':True,'message':'Cup is live'})
        assert saved.status_code==200
        public=client.get('/api/announcement').json()
        assert public['active'] is True
        assert public['message']=='Cup is live'

        assert client.put('/api/reels-queue',json={'queue':[{'id':'REEL-1'}]}).status_code==401
        q=client.put('/api/reels-queue',headers=admin,json={'queue':[{'id':'REEL-1','videoUrl':'https://cdn.example.com/a.mp4','status':'QUEUED'}]})
        assert q.status_code==200
        got=client.get('/api/reels-queue').json()
        assert got['queue'][0]['id']=='REEL-1'


def test_evidence_upload_guards_and_https_url():
    os.environ['ADMIN_KEY']='test-admin-secret'
    registration_attempts.clear()
    db.init()
    with TestClient(app) as client:
        admin={'X-Admin-Key':'test-admin-secret'}
        r=client.post('/api/admin/tournaments',headers=admin,json={'name':'Evidence Cup'})
        tid=r.json()['id']
        tokens=[]
        for i in range(8):
            tokens.append(client.post(f'/api/tournaments/{tid}/players',json={'display_name':f'P{i+1}','efootball_username':f'ev{i+1}'}).json()['player']['token'])
        client.post(f'/api/admin/tournaments/{tid}/bracket',headers=admin)
        match=client.get(f'/api/tournaments/{tid}/matches').json()[0]
        player={'X-Player-Token':tokens[0]}
        assert client.post('/api/upload',files={'file':('a.png',b'data','image/png')}).status_code==401
        assert client.post('/api/upload',files={'file':('a.txt',b'data','text/plain')},headers=player).status_code==400
        # Cloudinary is not configured in tests; storage must fail closed instead of writing local disk.
        assert client.post('/api/upload',files={'file':('a.png',b'\x89PNG', 'image/png')},headers=player).status_code==503
        ok=client.post(f"/api/matches/{match['id']}/result",headers=player,json={'score_a':2,'score_b':1,'evidence_url':'https://images.example.com/proof.png'})
        assert ok.status_code==200
        assert ok.json()['evidence_url']=='https://images.example.com/proof.png'
