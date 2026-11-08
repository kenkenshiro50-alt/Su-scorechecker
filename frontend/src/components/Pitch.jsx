import Crest from './Crest';

function rowIndex(pos) {
  const p = String(pos || '').toUpperCase();
  if (p.startsWith('G')) return 0;
  if (p.includes('M')) return 2;
  if (p.includes('B') || p.startsWith('D') || p.startsWith('CD')) return 1;
  return 3;
}

function buildRows(side) {
  const st = [...side.starters].sort((a, b) => (a.formationPlace || 99) - (b.formationPlace || 99));
  const counts = String(side.formation || '').split('-').map(Number).filter(n => n > 0);
  const ok = counts.length && counts.reduce((a, b) => a + b, 0) === st.length - 1 && st.every(p => p.formationPlace);
  if (ok) {
    const rows = [[st[0]]];
    let i = 1;
    counts.forEach(c => { rows.push(st.slice(i, i + c)); i += c; });
    return rows;
  }
  const rows = [[], [], [], []];
  st.forEach(p => rows[rowIndex(p.position)].push(p));
  return rows.filter(r => r.length);
}

function Side({ side, away }) {
  const rows = buildRows(side);
  return rows.map((row, ri) => {
    let x = rows.length > 1 ? 6 + ri * (38 / (rows.length - 1)) : 6;
    if (away) x = 100 - x;
    return row.map((p, i) => {
      let y = (i + 1) / (row.length + 1) * 100;
      if (away) y = 100 - y;
      return (
        <div key={p.name + ri + i} className="pp" style={{ left: `${x}%`, top: `${y}%` }} title={p.name}>
          <Crest name={p.name} logo={p.photo} />
          {p.subbedOut && <em className="so">↩</em>}
          <span className="pn">{p.jersey ?? ''} {String(p.name).split(' ').slice(-1)[0]}</span>
        </div>
      );
    });
  });
}

const Bar = ({ s, right }) => s ? (
  <span className={`pb ${right ? 'r' : ''}`}><Crest name={s.team} logo={s.logo} /><b>{s.team}</b><small>{s.formation || ''}</small></span>
) : <span />;

const Subs = ({ s }) => s ? (
  <div><div className="small" style={{ marginBottom: 4 }}>ตัวสำรอง · {s.team}</div>
    {s.substitutes.map(p => <div className="pl" key={p.name}><b>{p.jersey ?? ''}</b><span>{p.name}</span><span className="pos">{p.position ?? ''}</span></div>)}
  </div>
) : null;

export default function Pitch({ d }) {
  return (
    <>
      <div className="pitch-head"><Bar s={d.home} /><Bar s={d.away} right /></div>
      <div className="pitch">
        {d.home && <Side side={d.home} />}
        {d.away && <Side side={d.away} away />}
      </div>
      <div className="subs"><Subs s={d.home} /><Subs s={d.away} /></div>
    </>
  );
}
