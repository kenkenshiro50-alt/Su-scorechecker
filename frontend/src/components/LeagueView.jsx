import { useFetch } from '../api';
import Crest from './Crest';
import { Loading, Empty, ErrorBox } from './Status';

export default function LeagueView({ league, tab, sort, onTeam }) {
  const url = tab === 'table'
    ? `/api/standings?league=${encodeURIComponent(league)}&sort=${sort}`
    : `/api/teams?league=${encodeURIComponent(league)}`;
  const { loading, data, error } = useFetch(url);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;
  if (!data.data.length) return <Empty text={tab === 'table' ? 'ไม่มีตารางคะแนนของลีกนี้' : 'ไม่พบรายชื่อทีม'} />;

  if (tab === 'teams') return (
    <div className="tgrid">
      {data.data.map(t => (
        <div key={t.id} className="tcard link" onClick={() => onTeam(league, t.id)}>
          <Crest name={t.name} logo={t.logo} big /><span>{t.name}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="league"><table>
      <thead><tr><th>#</th><th>ทีม</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>{data.data.map((t, i) => (
        <tr key={t.team}><td>{i + 1}</td>
          <td><div className="tt link" onClick={() => t.teamId && onTeam(league, t.teamId)}><Crest name={t.team} logo={t.logo} /><span>{t.team}</span></div></td>
          <td>{t.playedGames}</td><td>{t.won}</td><td>{t.draw}</td><td>{t.lost}</td><td>{t.goalsFor}</td><td>{t.goalsAgainst}</td><td>{t.goalDifference}</td><td><b>{t.points}</b></td></tr>
      ))}</tbody>
    </table></div>
  );
}
