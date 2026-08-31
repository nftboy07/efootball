import os
import tempfile

os.environ['SQLITE_PATH']=tempfile.NamedTemporaryFile(suffix='.db',delete=False).name
os.environ['ENVIRONMENT']='development'
os.environ['ADMIN_KEY']='test-admin-secret'

from fastapi.testclient import TestClient
from app.main import app
from app import db


def test_full_lifecycle():
    os.environ['ADMIN_KEY']='test-admin-secret'
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
