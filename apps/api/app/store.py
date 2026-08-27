from threading import RLock

tournaments = {}
users = {}
matches = {}
lock = RLock()


def create_tournament(name: str):
    with lock:
        tid = f'EC-{len(tournaments)+1:06d}'
        tournaments[tid] = {
            'id': tid, 'name': name, 'max_players': 8, 'players': [],
            'status': 'OPEN', 'efootball_tournament_id': None,
            'bracket_generated': False,
        }
        return tournaments[tid]


def join_tournament(tid: str, user_id: str):
    with lock:
        t = tournaments.get(tid)
        if not t:
            return None, 'TOURNAMENT_NOT_FOUND'
        if t['status'] != 'OPEN':
            return None, 'REGISTRATION_CLOSED'
        if user_id in t['players']:
            return None, 'ALREADY_REGISTERED'
        if len(t['players']) >= 8:
            t['status'] = 'FULL'
            return None, 'TOURNAMENT_FULL'
        t['players'].append(user_id)
        if len(t['players']) == 8:
            t['status'] = 'FULL'
        return t, None


def generate_bracket(tid: str):
    with lock:
        t = tournaments[tid]
        if len(t['players']) != 8:
            raise ValueError('Tournament must have exactly 8 players')
        ids = t['players'][:]
        pairs = [(ids[0], ids[7]), (ids[3], ids[4]), (ids[1], ids[6]), (ids[2], ids[5])]
        for i, (a, b) in enumerate(pairs, 1):
            mid = f'{tid}-QF{i}'
            matches[mid] = {
                'id': mid, 'tournament_id': tid, 'round': 'QF',
                'player_a': a, 'player_b': b, 'score_a': None,
                'score_b': None, 'winner': None, 'status': 'READY',
                'evidence': [],
            }
        t['status'] = 'LOCKED'
        t['bracket_generated'] = True
        return t
