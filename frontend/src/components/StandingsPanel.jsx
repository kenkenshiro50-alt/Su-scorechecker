import { useFetch } from '../api';
import Crest from './Crest';
import { Loading, Empty, ErrorBox } from './Status';

export default function StandingsPanel({ league, leagues, sort, setSort, onTeam, selectedLeague, onLeagueChange }) {
  const actualLeague = selectedLeague || league;
  const { loading, data, error } = useFetch(`/api/standings?league=${encodeURIComponent(actualLeague)}&sort=${sort}`);
  const name = leagues.find(l => l.code === actualLeague)?.name || 'ตารางคะแนน';
  const rows = data?.data || [];
  return (
    <div className="box">
      <div className="box-head">
        <h3><i className="fa-solid fa-trophy"></i> {name}</h3>
        <select value={actualLeague} onChange={e => onLeagueChange?.(e.target.value)}>
          <option value="all">ALL</option>
          {leagues.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : !rows.length ? <Empty text="ไม่มีตารางคะแนน" /> : (
        <>
          <table><thead><tr><th>#</th><th>ทีม</th><th>แข่ง</th><th>GD</th><th>Pts</th></tr></thead>
            <tbody>{rows.map((t, i) => (
              <tr key={t.team} className={`${i < 4 ? 'cl' : ''} ${rows.length > 10 && i >= rows.length - 3 ? 'rel' : ''}`}>
                <td>{i + 1}</td>
                <td><div className="tt link" onClick={() => t.teamId && onTeam(actualLeague, t.teamId)}><Crest name={t.team} logo={t.logo} /><span>{t.team}</span></div></td>
                <td>{t.playedGames}</td><td>{t.goalDifference}</td><td><b>{t.points}</b></td></tr>
            ))}</tbody></table>
          <div className="small">ใช้ {data.algorithm} Sort: {data.ms} ms</div>
        </>
      )}
    </div>
  );
}
