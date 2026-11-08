import Crest from './Crest';

export default function LeagueSidebar({ leagues, league, onSelect }) {
  const Item = ({ code, name, n, logo, icon }) => (
    <div className={`lg-item ${league === code ? 'active' : ''}`} onClick={() => onSelect(code)}>
      {icon || <Crest name={name} logo={logo} />}
      <span>{name}</span>{n ? <small>{n}</small> : null}
    </div>
  );
  return (
    <nav className="left">
      <h3>ลีก</h3>
      <Item code="all" name="ALL" icon={<i className="fa-solid fa-futbol" />} />
      {leagues.map(l => <Item key={l.code} code={l.code} name={l.name} n={l.matches} logo={l.logo} />)}
    </nav>
  );
}
