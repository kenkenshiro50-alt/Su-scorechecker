import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { dkey } from './utils';
import LeagueSidebar from './components/LeagueSidebar';
import MatchList from './components/MatchList';
import LeagueView from './components/LeagueView';
import StandingsPanel from './components/StandingsPanel';
import QueueHistory from './components/QueueHistory';
import Modal from './components/Modal';
import { Loading, ErrorBox } from './components/Status';

const readFavs = () => { try { return JSON.parse(localStorage.getItem('favs') || '[]'); } catch { return []; } };

export default function App() {
  const [leagues, setLeagues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [league, setLeague] = useState('all');
  const [tab, setTab] = useState('matches');
  const [date, setDate] = useState(dkey(new Date()));
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('selection');
  const [favs, setFavs] = useState(readFavs);
  const [modal, setModal] = useState(null);
  const [tick, setTick] = useState(0);
  const [selectedLeague, setSelectedLeague] = useState('eng.1');

  useEffect(() => {
    if (league === 'all' && !selectedLeague) setSelectedLeague('eng.1');
  }, [league, selectedLeague]);

  const load = useCallback(async () => {
    try {
      const [l, m] = await Promise.all([api('/api/leagues'), api('/api/matches')]);
      setLeagues(l.data); setMatches(m.data); setSource(m.source);
      setStatus('ok'); setTick(t => t + 1);
    } catch (e) { setError(e.message); setStatus(s => (s === 'ok' ? 'ok' : 'error')); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (!matches.length) return;
    const keys = [...new Set(matches.map(m => dkey(new Date(m.utcDate))))];
    if (keys.includes(date)) return;
    const now = Date.now();
    keys.sort((a, b) => Math.abs(new Date(a + 'T12:00:00') - now) - Math.abs(new Date(b + 'T12:00:00') - now));
    setDate(keys[0]);
  }, [matches]); // eslint-disable-line

  const toggleFav = m => {
    const on = favs.includes(m.homeTeam) || favs.includes(m.awayTeam);
    const next = on ? favs.filter(n => n !== m.homeTeam && n !== m.awayTeam) : [...new Set([...favs, m.homeTeam, m.awayTeam])];
    setFavs(next);
    try { localStorage.setItem('favs', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const openMatch = id => setModal({ type: 'match', id });
  const openTeam = (lg, id) => setModal({ type: 'team', league: lg, id });
  const current = leagues.find(l => l.code === league);

  return (
    <>
      <header><div className="nav">
        <div className="logo">SU Score888</div><a className="active">แมตช์</a>
        <input className="search" placeholder="ค้นหาทีม" value={query} onChange={e => setQuery(e.target.value)} />
        <button className="reload" onClick={load} title="โหลดข้อมูลใหม่"><i className="fa-solid fa-rotate"></i></button>
      </div></header>
      <main>
        <LeagueSidebar leagues={leagues} league={league} onSelect={c => { setLeague(c); setTab('matches'); if (c !== 'all') setSelectedLeague(c); }} />
        <section>
          {status === 'loading' && <Loading />}
          {status === 'error' && <ErrorBox message={error} onRetry={load} />}
          {status === 'ok' && (
            <>
              {current && (
                <>
                  <h2 className="lt">{current.name}</h2>
                  <div className="tabs">{[['matches', 'แมตช์'], ['table', 'ตาราง'], ['teams', 'ทีม']].map(([k, l]) =>
                    <a key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</a>)}</div>
                </>
              )}
              {!current || tab === 'matches'
                ? <MatchList {...{ matches, leagues, league, date, setDate, filter, setFilter, query, favs, source }} onFav={toggleFav} onOpen={openMatch} />
                : <LeagueView league={league} tab={tab} sort={sort} onTeam={openTeam} />}
            </>
          )}
        </section>
        <aside className="side">
          <StandingsPanel league={league === 'all' ? 'eng.1' : league} leagues={leagues} sort={sort} setSort={setSort} onTeam={openTeam} selectedLeague={selectedLeague} onLeagueChange={setSelectedLeague} />
          <QueueHistory tick={tick} />
        </aside>
      </main>
      {modal && <Modal modal={modal} matches={matches} onClose={() => setModal(null)}
        onTeam={openTeam} onMatch={openMatch} onViewed={() => setTick(t => t + 1)} />}
    </>
  );
}
