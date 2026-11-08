import { useState } from 'react';
import { dkey, statusInfo, LIVE } from '../utils';
import Crest from './Crest';
import { Empty } from './Status';

const FILTERS = [['all', 'ทั้งหมด'], ['live', <><i className="fa-solid fa-signal-stream" /> {' สด'}</>], ['ft', 'จบแล้ว'], ['ns', 'ยังไม่แข่ง'], ['fav', <><i className="fa-solid fa-star" /> {' ทีมโปรด'}</>]];

function Row({ m, fav, onOpen, onFav }) {
  const st = statusInfo(m);
  const has = m.homeScore != null && m.awayScore != null;
  return (
    <div className="match" onClick={() => onOpen(m.id)}>
      <div className={`status ${st.k === 'live' ? 'live' : ''}`}>{st.t}</div>
      <div className="team home"><Crest name={m.homeTeam} logo={m.homeTeamLogo} /><span className="n">{m.homeTeam}</span></div>
      <div className={`score ${st.k === 'live' ? 'live' : st.k === 'ns' ? 'ns' : ''}`}>{has ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</div>
      <div className="team"><Crest name={m.awayTeam} logo={m.awayTeamLogo} /><span className="n">{m.awayTeam}</span></div>
      <div className={`star ${fav ? 'on' : ''}`} onClick={e => { e.stopPropagation(); onFav(m); }} title="ทีมโปรด"><i className="fa-solid fa-star" /></div>
    </div>
  );
}

export default function MatchList({ matches, leagues, league, date, setDate, filter, setFilter, query, favs, onFav, onOpen, source }) {
  const [closed, setClosed] = useState(new Set());
  const today = dkey(new Date());
  const keys = [...new Set([today, ...matches.map(m => dkey(new Date(m.utcDate)))])].sort();
  const q = query.trim().toLowerCase();
  const isFav = m => favs.includes(m.homeTeam) || favs.includes(m.awayTeam);

  const list = matches
    .filter(m => dkey(new Date(m.utcDate)) === date)
    .filter(m => league === 'all' || m.leagueCode === league)
    .filter(m => {
      if (filter === 'live') return LIVE.includes(m.status);
      if (filter === 'ft') return m.status === 'FINISHED';
      if (filter === 'ns') return m.status === 'SCHEDULED';
      if (filter === 'fav') return isFav(m);
      return true;
    })
    .filter(m => !q || m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q));

  const groups = new Map();
  list.forEach(m => {
    if (!groups.has(m.leagueCode)) groups.set(m.leagueCode, { name: m.league, rows: [] });
    groups.get(m.leagueCode).rows.push(m);
  });
  const logoOf = c => leagues.find(l => l.code === c)?.logo;
  const toggle = c => setClosed(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <>
      <div className="dates">
        {keys.map(k => {
          const d = new Date(k + 'T00:00:00');
          return (
            <div key={k} className={`date ${k === date ? 'active' : ''}`} onClick={() => setDate(k)}>
              <small>{k === today ? 'วันนี้' : d.toLocaleDateString('th-TH', { weekday: 'short' })}</small>
              <b>{d.getDate()}/{d.getMonth() + 1}</b>
            </div>
          );
        })}
      </div>
      <div className="filters">
        {FILTERS.map(([k, l]) => <div key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</div>)}
      </div>
      {!list.length ? <Empty text="ไม่พบแมตช์" /> : [...groups].map(([code, g]) => (
        <div key={code} className={`league ${closed.has(code) ? 'closed' : ''}`}>
          <div className="lh" onClick={() => toggle(code)}>
            <Crest name={g.name} logo={logoOf(code)} />
            <div><b>{g.name}</b><small>{g.rows.length} แมตช์</small></div>
            <span className="arrow">▾</span>
          </div>
          <div className="matches">{g.rows.map(m => <Row key={m.id} m={m} fav={isFav(m)} onOpen={onOpen} onFav={onFav} />)}</div>
        </div>
      ))}
      <div className="source">แหล่งข้อมูล: {source}</div>
    </>
  );
}
