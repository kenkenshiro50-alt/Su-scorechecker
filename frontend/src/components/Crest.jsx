import { useState } from 'react';
import { color, initials } from '../utils';

export default function Crest({ name, logo, big }) {
  const [bad, setBad] = useState(false);
  const has = logo && !bad;
  return (
    <span className={`crest ${has ? 'has-logo' : ''} ${big ? 'lg' : ''}`} style={{ background: color(name) }}>
      {initials(name)}
      {has && <img src={logo} alt="" loading="lazy" onError={() => setBad(true)} />}
    </span>
  );
}
