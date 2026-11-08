import { useEffect, useRef } from 'react';
import { api, useFetch } from '../api';
import { fmtDate, statusInfo, statusTH, LiveIcon } from '../utils';
import Crest from './Crest';
import Pitch from './Pitch';
import { Loading, ErrorBox } from './Status';

function MatchDetail({ id, matches, onTeam, onViewed }) {
  const m = matches.find(x => x.id === id);
  const { loading, data, error } = useFetch(`/api/match/${id}`);
  useEffect(() => {
    api('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      .then(onViewed).catch(() => {});
  }, [id]); // eslint-disable-line
  if (!m) return <ErrorBox message="ไม่พบการแข่งขัน" />;
  const st = statusInfo(m);
  const has = m.homeScore != null && m.awayScore != null;
  const Team = ({ name, logo, tid }) => (
    <div className={`match-team ${tid ? 'link' : ''}`} onClick={() => tid && onTeam(m.leagueCode, tid)}>
      <Crest name={name} logo={logo} big /><span>{name}</span>
    </div>
  );
  return (
    <>
      <div className="match-teams">
        <Team name={m.homeTeam} logo={m.homeTeamLogo} tid={m.homeTeamId} />
        <div className="match-score">{has ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</div>
        <Team name={m.awayTeam} logo={m.awayTeamLogo} tid={m.awayTeamId} />
      </div>
      <div className="match-meta"><span>{m.league} · {fmtDate(m.utcDate)}</span>
        <span className={`badge ${st.k === 'live' ? 'live' : ''}`}>
          {st.k === 'live' ? <LiveIcon className="live-inline" title="LIVE" /> : statusTH(m.status)}
        </span></div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> :
        data.available ? <Pitch d={data} /> :
        <div className="empty">ยังไม่มีข้อมูลตัวจริง/แผนการเล่นของแมตช์นี้</div>}
    </>
  );
}

function TeamDetail({ league, id, onMatch }) {
  const { loading, data, error } = useFetch(`/api/team/${encodeURIComponent(league)}/${id}`);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  const t = data.team;
  const Sec = ({ title, list }) => list.length ? (
    <div className="lu"><h4>{title}</h4>
      {list.map(m => <div key={m.id} className="pl link" onClick={() => onMatch(m.id)}>
        <span>{m.homeTeam} {m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : 'vs'} {m.awayTeam}</span>
        <span className="pos">{fmtDate(m.utcDate)}</span></div>)}
    </div>) : null;
  return (
    <>
      <div className="match-team" style={{ marginBottom: 12 }}><Crest name={t.name || '?'} logo={t.logo} big />
        <span>{t.name}</span><span className="small">{t.venue || ''} {t.record ? `· ${t.record}` : ''}</span></div>
      <Sec title="🔴 กำลังแข่ง" list={data.live} />
      <Sec title="แมตช์ถัดไป" list={data.upcoming} />
      <Sec title="ผลล่าสุด" list={data.recent} />
      <div className="lu"><h4>🩹 นักเตะบาดเจ็บ</h4>
        {data.injured.length ? data.injured.map(p => <div className="pl warn" key={p.id}><span>{p.name}</span>
          <span className="pos">{p.injuries[0].status}{p.injuries[0].detail ? ` · ${p.injuries[0].detail}` : ''}</span></div>)
          : <div className="small">{data.injuryDataAvailable ? 'ไม่มีนักเตะบาดเจ็บ' : 'ไม่มีข้อมูลการบาดเจ็บจากแหล่งข้อมูลนี้'}</div>}
      </div>
      <div className="lu"><h4>รายชื่อนักเตะ ({data.players.length})</h4>
        {data.players.map(p => <div className="pl" key={p.id}><b>{p.jersey ?? ''}</b><span>{p.name}</span><span className="pos">{p.position ?? ''}</span></div>)}
      </div>
    </>
  );
}

export default function Modal({ modal, matches, onClose, onTeam, onMatch, onViewed }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="match-dialog" onClose={onClose} onClick={e => e.target === ref.current && ref.current.close()}>
      <div className="dialog-head">
        <h2>{modal.type === 'match' ? 'รายละเอียดการแข่งขัน' : 'ข้อมูลทีม'}</h2>
        <button type="button" className="x" onClick={() => ref.current.close()}>×</button>
      </div>
      <div className="match-details">
        {modal.type === 'match'
          ? <MatchDetail key={modal.id} id={modal.id} matches={matches} onTeam={onTeam} onViewed={onViewed} />
          : <TeamDetail key={modal.id} league={modal.league} id={modal.id} onMatch={onMatch} />}
      </div>
    </dialog>
  );
}
