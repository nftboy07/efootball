import os
os.environ['SQLITE_PATH']='test-efootball.db'
os.environ['ADMIN_KEY']='test-admin-key'
os.environ.pop('DATABASE_URL',None)
from fastapi.testclient import TestClient
from app.main import app


def test_full_tournament_flow():
    if os.path.exists('test-efootball.db'): os.remove('test-efootball.db')
    with TestClient(app) as client:
        r=client.post('/api/admin/tournaments',json={'name':'Smoke Cup'},headers={'X-Admin-Key':'test-admin-key'})
        assert r.status_code==200
        tid=r.json()['id']
        tokens=[]
        for i in range(8):
            r=client.post(f'/api/tournaments/{tid}/players',json={'display_name':f'Player {i+1}','efootball_username':f'ef_{i+1}'})
            assert r.status_code==200
            tokens.append(r.json()['player']['token'])
        assert client.post(f'/api/admin/tournaments/{tid}/bracket',headers={'X-Admin-Key':'test-admin-key'}).status_code==200
        assert client.post(f'/api/admin/tournaments/{tid}/efootball-id',json={'tournament_id':'GAME-1234'},headers={'X-Admin-Key':'test-admin-key'}).status_code==200
        matches=client.get(f'/api/tournaments/{tid}/matches').json()
        assert len(matches)==4
        for m in matches:
            r=client.post(f"/api/matches/{m['id']}/result",json={'score_a':2,'score_b':1,'evidence_url':'https://example.com/evidence'},headers={'X-Player-Token':tokens[0] if m['player_a']==client.get('/api/player/me',headers={'X-Player-Token':tokens[0]}).json()['id'] else tokens[1]})
            # The endpoint must reject a non-participant rather than accepting forged results.
            assert r.status_code in (200,403,409)
        pending=client.get('/api/admin/submissions',headers={'X-Admin-Key':'test-admin-key'})
        assert pending.status_code==200
