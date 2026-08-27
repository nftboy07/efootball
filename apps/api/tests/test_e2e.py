import os
os.environ['SQLITE_PATH']='test-efootball.db'
os.environ['ADMIN_KEY']='test-admin-key'
os.environ.pop('DATABASE_URL',None)
from fastapi.testclient import TestClient
from app.main import app

def test_full_registration_and_bracket_flow():
    if os.path.exists('test-efootball.db'): os.remove('test-efootball.db')
    with TestClient(app) as client:
        r=client.post('/api/admin/tournaments',json={'name':'Smoke Cup'},headers={'X-Admin-Key':'test-admin-key'})
        assert r.status_code==200
        tid=r.json()['id']
        player_tokens=[]
        for i in range(8):
            r=client.post(f'/api/tournaments/{tid}/players',json={'display_name':f'Player {i+1}','efootball_username':f'ef_{i+1}'})
            assert r.status_code==200
            player_tokens.append(r.json()['player']['token'])
        assert client.post(f'/api/tournaments/{tid}/players',json={'display_name':'Player 9','efootball_username':'ef_9'}).status_code==409
        assert client.post(f'/api/admin/tournaments/{tid}/bracket',headers={'X-Admin-Key':'test-admin-key'}).status_code==200
        assert client.post(f'/api/admin/tournaments/{tid}/efootball-id',json={'tournament_id':'GAME-1234'},headers={'X-Admin-Key':'test-admin-key'}).status_code==200
        matches=client.get(f'/api/tournaments/{tid}/matches').json()
        assert len(matches)==4
        # Non-participants cannot submit a result.
        assert client.post(f"/api/matches/{matches[0]['id']}/result",json={'score_a':2,'score_b':1},headers={'X-Player-Token':player_tokens[4]}).status_code==409
        assert client.get('/api/leaderboard').status_code==200
