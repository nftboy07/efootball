from fastapi.testclient import TestClient
from app.main import app
from app.store import tournaments, users, matches

client = TestClient(app)

def setup_function():
    tournaments.clear(); users.clear(); matches.clear()

def test_eight_player_registration_and_bracket():
    r = client.post('/api/admin/tournaments', json={'name':'Test Cup'})
    assert r.status_code == 200
    tid = r.json()['id']
    for i in range(8):
        r = client.post(f'/api/tournaments/{tid}/players', json={'display_name':f'Player {i+1}','efootball_username':f'p{i+1}'})
        assert r.status_code == 200
    assert client.get(f'/api/tournaments/{tid}').json()['status'] == 'FULL'
    r = client.post(f'/api/admin/tournaments/{tid}/bracket')
    assert r.status_code == 200
    assert len(client.get(f'/api/tournaments/{tid}/matches').json()) == 4
    r = client.post(f'/api/admin/tournaments/{tid}/efootball-id', json={'tournament_id':'0004-6470-6202'})
    assert r.status_code == 200
    assert r.json()['status'] == 'IN_PROGRESS'

def test_ninth_player_rejected():
    tid = client.post('/api/admin/tournaments', json={'name':'Full Cup'}).json()['id']
    for i in range(8):
        assert client.post(f'/api/tournaments/{tid}/players', json={'display_name':f'P{i}','efootball_username':f'p{i}'}).status_code == 200
    assert client.post(f'/api/tournaments/{tid}/players', json={'display_name':'Ninth','efootball_username':'p9'}).status_code == 409
