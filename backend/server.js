// Football League Score Checker
// Express เป็นตัวกลาง (proxy) ระหว่าง Browser กับ ESPN public API

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MATCH_REFRESH_MS = 60 * 1000;
const CACHE_MS = 10 * 60 * 1000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const STANDINGS_BASE = 'https://site.api.espn.com/apis/v2/sports/soccer';

const LEAGUES = [
  { code: 'eng.1', name: 'Premier League' },
  { code: 'eng.2', name: 'Championship' },
  { code: 'esp.1', name: 'La Liga' },
  { code: 'ger.1', name: 'Bundesliga' },
  { code: 'ita.1', name: 'Serie A' },
  { code: 'fra.1', name: 'Ligue 1' },
  { code: 'ned.1', name: 'Eredivisie' },
  { code: 'por.1', name: 'Primeira Liga' },
  { code: 'sco.1', name: 'Scottish Premiership' },
  { code: 'tur.1', name: 'Süper Lig' },
  { code: 'uefa.champions', name: 'UEFA Champions League' },
  { code: 'uefa.europa', name: 'UEFA Europa League' },
  { code: 'usa.1', name: 'MLS' },
  { code: 'bra.1', name: 'Brasileirão' },
  { code: 'arg.1', name: 'Liga Argentina' },
  { code: 'jpn.1', name: 'J1 League' },
  { code: 'tha.1', name: 'Thai League' }
];

let matches = [];
let source = 'fallback';
let hasLiveData = false;
const standingsCache = {}; // code -> { at, data }
const lineupCache = {};    // matchId -> { at, data }
const teamsCache = {};     // code -> { at, data }
const teamCache = {};      // code:id -> { at, data }

// -----------------------------
// DSA: Sorting
// -----------------------------
function selectionSort(arr) {
  const a = [...arr];
  for (let i = 0; i < a.length - 1; i++) {
    let best = i;
    for (let j = i + 1; j < a.length; j++) {
      if (
        a[j].points > a[best].points ||
        (a[j].points === a[best].points && a[j].goalDifference > a[best].goalDifference)
      ) best = j;
    }
    [a[i], a[best]] = [a[best], a[i]];
  }
  return a;
}

function insertionSort(arr) {
  const a = [...arr];
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (
      j >= 0 &&
      (a[j].points < key.points ||
       (a[j].points === key.points && a[j].goalDifference < key.goalDifference))
    ) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}

function bubbleSort(arr) {
  const a = [...arr];
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - 1 - i; j++) {
      const shouldSwap =
        a[j].points < a[j + 1].points ||
        (a[j].points === a[j + 1].points &&
         a[j].goalDifference < a[j + 1].goalDifference);
      if (shouldSwap) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}

// -----------------------------
// DSA: Queue (FIFO)
// -----------------------------
class Queue {
  constructor() { this.items = []; }
  enqueue(item) { this.items.push(item); }
  dequeue() { return this.items.shift(); }
  peek() { return this.items[0] || null; }
  size() { return this.items.length; }
}

const matchQueue = new Queue();
const processedIds = new Set();

function rebuildQueue() {
  matchQueue.items = matches.filter(m =>
    ['SCHEDULED', 'IN_PLAY', 'PAUSED'].includes(m.status) && !processedIds.has(m.id)
  );
}

// -----------------------------
// DSA: Stack (LIFO)
// -----------------------------
class Stack {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1] || null; }
  isEmpty() { return this.items.length === 0; }
  display() { return [...this.items].reverse(); }
}

const history = new Stack();

// -----------------------------
// ข้อมูลสำรอง (วันที่คิดจากวันนี้ ไม่ค้างเป็นของเก่า)
// -----------------------------
const TEAM_IDS = {
  Arsenal: 359, Chelsea: 363, Liverpool: 364, Everton: 368,
  'Manchester City': 382, Tottenham: 367, 'Manchester United': 360, 'Aston Villa': 362
};
const teamLogo = name =>
  TEAM_IDS[name] ? `https://a.espncdn.com/i/teamlogos/soccer/500/${TEAM_IDS[name]}.png` : null;

function fallbackMatches() {
  const at = (dayOffset, hour) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const m = (id, utcDate, status, home, away, hs, as) => ({
    id, utcDate, status, leagueCode: 'eng.1', league: 'Premier League', matchday: null,
    homeTeam: home, awayTeam: away,
    homeTeamId: TEAM_IDS[home] || null, awayTeamId: TEAM_IDS[away] || null,
    homeTeamLogo: teamLogo(home), awayTeamLogo: teamLogo(away),
    homeScore: hs, awayScore: as
  });
  return [
    m(1, at(-1, 14), 'FINISHED', 'Arsenal', 'Chelsea', 2, 1),
    m(2, at(-1, 16), 'FINISHED', 'Liverpool', 'Everton', 3, 0),
    m(3, at(1, 13), 'SCHEDULED', 'Manchester City', 'Tottenham', null, null),
    m(4, at(1, 15), 'SCHEDULED', 'Manchester United', 'Aston Villa', null, null)
  ];
}

function fallbackStandings() {
  const s = (position, team, playedGames, won, draw, lost, points, goalsFor, goalsAgainst) => ({
    position, team, teamId: TEAM_IDS[team] || null, logo: teamLogo(team),
    playedGames, won, draw, lost, points,
    goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst
  });
  return [
    s(1, 'Arsenal', 6, 5, 1, 0, 16, 14, 5),
    s(2, 'Liverpool', 6, 5, 0, 1, 15, 13, 6),
    s(3, 'Manchester City', 6, 4, 1, 1, 13, 15, 8),
    s(4, 'Chelsea', 6, 3, 2, 1, 11, 10, 7)
  ];
}

// -----------------------------
// เรียก ESPN
// -----------------------------
async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`ESPN API status ${res.status}`);
  return res.json();
}

const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
function dateRange() {
  const now = Date.now(), day = 864e5;
  return `${ymd(new Date(now - 3 * day))}-${ymd(new Date(now + 7 * day))}`;
}

function mapStatus(type) {
  switch (type?.name) {
    case 'STATUS_POSTPONED': return 'POSTPONED';
    case 'STATUS_CANCELED': return 'CANCELLED';
    case 'STATUS_HALFTIME': return 'PAUSED';
  }
  if (type?.state === 'post') return 'FINISHED';
  if (type?.state === 'in') return 'IN_PLAY';
  return 'SCHEDULED';
}

function mapEvent(e, league) {
  const c = e.competitions?.[0];
  const home = c?.competitors?.find(x => x.homeAway === 'home');
  const away = c?.competitors?.find(x => x.homeAway === 'away');
  const status = mapStatus(e.status?.type);
  const hasScore = status === 'FINISHED' || status === 'IN_PLAY' || status === 'PAUSED';
  return {
    id: Number(e.id),
    utcDate: e.date,
    status,
    leagueCode: league.code,
    league: league.name,
    matchday: e.week?.number ?? null,
    homeTeam: home?.team?.displayName || '-',
    awayTeam: away?.team?.displayName || '-',
    homeTeamId: home?.team?.id ? Number(home.team.id) : null,
    awayTeamId: away?.team?.id ? Number(away.team.id) : null,
    homeTeamLogo: home?.team?.logos?.[0]?.href || home?.team?.logo || null,
    awayTeamLogo: away?.team?.logos?.[0]?.href || away?.team?.logo || null,
    homeScore: hasScore && home?.score != null ? Number(home.score) : null,
    awayScore: hasScore && away?.score != null ? Number(away.score) : null
  };
}

// ลองหลายรูปแบบ URL ถ้าแบบแรกล้มเหลว
async function fetchScoreboard(code, dates) {
  const urls = [
    `${API_BASE}/${code}/scoreboard?limit=100&dates=${dates}`,
    `${API_BASE}/${code}/scoreboard?dates=${dates}`,
    `${API_BASE}/${code}/scoreboard`
  ];
  let lastErr;
  for (const u of urls) {
    try { return await getJson(u); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function loadMatches() {
  try {
    const dates = dateRange();
    const results = await Promise.allSettled(
      LEAGUES.map(l =>
        fetchScoreboard(l.code, dates)
          .then(d => {
            const logos = d.leagues?.[0]?.logos || [];
            const pick = logos.find(x => (x.rel || []).includes('dark')) || logos[0];
            if (pick?.href) l.logo = pick.href;
            return (d.events || []).map(e => mapEvent(e, l));
          })
      )
    );

    const ok = results.filter(r => r.status === 'fulfilled');
    const failed = results.length - ok.length;
    const firstErr = results.find(r => r.status === 'rejected');
    if (firstErr) console.log('ตัวอย่างสาเหตุที่ล้มเหลว:', firstErr.reason?.cause?.code || firstErr.reason?.message);

    if (ok.length > 0) {
      matches = ok.flatMap(r => r.value)
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
      hasLiveData = true;
      source = 'ESPN public API (no API key)';
      console.log(`API สำเร็จ: ${ok.length}/${results.length} ลีก, ${matches.length} matches` +
        (failed ? ` (ข้าม ${failed} ลีก)` : ''));
    } else if (!hasLiveData) {
      matches = fallbackMatches();
      source = 'fallback (ESPN ใช้ไม่ได้)';
      console.log('ใช้ข้อมูลสำรอง: เรียก ESPN ไม่ได้ทุกลีก');
    } else {
      console.log('รีเฟรชไม่สำเร็จ ใช้ข้อมูลเดิมต่อ');
    }
  } catch (err) {
    console.log('loadMatches error:', err.message);
    if (!matches.length) { matches = fallbackMatches(); source = 'fallback'; }
  }
  rebuildQueue();
}

function parseStandings(tableData) {
  let entries = (tableData.children || []).flatMap(c => c.standings?.entries || []);
  if (!entries.length) entries = tableData.standings?.entries || [];
  return entries.map((t, i) => {
    const stats = {};
    (t.stats || []).forEach(s => { stats[s.name] = Number(s.value ?? 0); });
    const gf = stats.pointsFor || stats.goalsFor || 0;
    const ga = stats.pointsAgainst || stats.goalsAgainst || 0;
    return {
      position: stats.rank || i + 1,
      team: t.team?.displayName || '-',
      teamId: t.team?.id ? Number(t.team.id) : null,
      logo: t.team?.logos?.[0]?.href || t.team?.logo || null,
      playedGames: stats.gamesPlayed || stats.played || 0,
      won: stats.wins || 0,
      draw: stats.ties || stats.draws || 0,
      lost: stats.losses || 0,
      points: stats.points || 0,
      goalsFor: gf,
      goalsAgainst: ga,
      goalDifference: stats.pointDifferential || (gf - ga)
    };
  });
}

async function getStandings(code) {
  const cached = standingsCache[code];
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  try {
    const data = parseStandings(await getJson(`${STANDINGS_BASE}/${code}/standings`));
    standingsCache[code] = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.log(`standings ${code}: ${err.message}`);
    if (cached) return cached.data;
    return code === 'eng.1' && !hasLiveData ? fallbackStandings() : [];
  }
}

// แผนการเล่น + รายชื่อนักเตะ จาก endpoint summary
function parseLineups(summary, match) {
  const rosters = summary.rosters || [];
  const mapTeam = r => {
    const f = r.formation;
    const formation = typeof f === 'string' ? f : (f?.summary || f?.name || null);
    const players = (r.roster || []).map(p => ({
      name: p.athlete?.displayName || p.athlete?.fullName || '-',
      jersey: p.jersey ?? p.athlete?.jersey ?? null,
      position: p.position?.abbreviation || p.position?.displayName || null,
      starter: !!p.starter,
      subbedIn: !!p.subbedIn,
      subbedOut: !!p.subbedOut,
      formationPlace: p.formationPlace != null ? Number(p.formationPlace) : null,
      photo: p.athlete?.headshot?.href || null
    }));
    return {
      team: r.team?.displayName || '-',
      logo: r.team?.logo || r.team?.logos?.[0]?.href || null,
      formation,
      starters: players.filter(p => p.starter),
      substitutes: players.filter(p => !p.starter)
    };
  };
  const byId = id => rosters.find(r => id && Number(r.team?.id) === id);
  const home = rosters.find(r => r.homeAway === 'home') || byId(match?.homeTeamId) || rosters[0];
  const away = rosters.find(r => r.homeAway === 'away') || byId(match?.awayTeamId) || rosters[1];
  return {
    available: !!(home?.roster?.length || away?.roster?.length),
    home: home ? mapTeam(home) : null,
    away: away ? mapTeam(away) : null
  };
}

// -----------------------------
// Routes
// -----------------------------
app.get('/api/leagues', (req, res) => {
  const data = LEAGUES.map(l => ({
    ...l,
    matches: matches.filter(m => m.leagueCode === l.code).length
  }));
  res.json({ count: data.length, data });
});

app.get('/api/matches', (req, res) => {
  const { status, league } = req.query;
  let data = matches;
  if (league) data = data.filter(m => m.leagueCode === league);
  if (status) data = data.filter(m => m.status === status);
  res.json({ source, league: league || 'all', count: data.length, data });
});

app.get('/api/match/:id', async (req, res) => {
  const id = Number(req.params.id);
  const match = matches.find(m => m.id === id);
  if (!match) return res.status(404).json({ error: 'ไม่พบการแข่งขัน' });

  const cached = lineupCache[id];
  if (cached && Date.now() - cached.at < 60 * 1000) return res.json(cached.data);

  try {
    const summary = await getJson(`${API_BASE}/${match.leagueCode}/summary?event=${id}`);
    const data = { match, ...parseLineups(summary, match), keys: Object.keys(summary) };
    lineupCache[id] = { at: Date.now(), data };
    res.json(data);
  } catch (err) {
    res.json({ match, available: false, home: null, away: null, error: err.message });
  }
});

app.get('/api/standings', async (req, res) => {
  const league = req.query.league || LEAGUES[0].code;
  const algo = req.query.sort || 'selection';
  const standings = await getStandings(league);

  const t0 = performance.now();
  let sorted;
  if (algo === 'insertion') sorted = insertionSort(standings);
  else if (algo === 'bubble') sorted = bubbleSort(standings);
  else sorted = selectionSort(standings);
  const ms = (performance.now() - t0).toFixed(3);

  res.json({ source, league, algorithm: algo, count: sorted.length, ms, data: sorted });
});

app.get('/api/queue', (req, res) => {
  res.json({ size: matchQueue.size(), next: matchQueue.peek(), items: matchQueue.items });
});

app.delete('/api/queue/process', (req, res) => {
  if (matchQueue.size() === 0) return res.status(400).json({ error: 'ไม่มีการแข่งขันในคิว' });
  const match = matchQueue.dequeue();
  processedIds.add(match.id);
  history.push({ action: 'PROCESS_MATCH', match, time: new Date().toLocaleTimeString('th-TH') });
  res.json({ message: `นำ ${match.homeTeam} vs ${match.awayTeam} ออกจากคิว`, match, size: matchQueue.size() });
});

app.post('/api/history', (req, res) => {
  const match = matches.find(m => m.id === Number(req.body?.id));
  if (!match) return res.status(404).json({ error: 'ไม่พบการแข่งขัน' });
  history.push({ action: 'VIEW_MATCH', match, time: new Date().toLocaleTimeString('th-TH') });
  res.json({ message: 'บันทึกประวัติแล้ว', size: history.items.length });
});

app.get('/api/history', (req, res) => {
  res.json({ size: history.items.length, data: history.display() });
});

app.delete('/api/history/undo', (req, res) => {
  if (history.isEmpty()) return res.status(400).json({ error: 'ไม่มีประวัติ' });
  res.json({ removed: history.pop(), size: history.items.length });
});

// รายชื่อทีมในลีก
app.get('/api/teams', async (req, res) => {
  const code = req.query.league || LEAGUES[0].code;
  const cached = teamsCache[code];
  if (cached && Date.now() - cached.at < CACHE_MS) return res.json(cached.data);
  try {
    const d = await getJson(`${API_BASE}/${code}/teams`);
    const list = d.sports?.[0]?.leagues?.[0]?.teams || [];
    const data = {
      league: code,
      data: list.map(({ team: t }) => ({
        id: Number(t.id),
        name: t.displayName,
        short: t.abbreviation || null,
        logo: t.logos?.[0]?.href || null
      }))
    };
    teamsCache[code] = { at: Date.now(), data };
    res.json(data);
  } catch (err) {
    res.json({ league: code, data: [], error: err.message });
  }
});

// หน้าทีม (นักเตะ + คนเจ็บ + แมตช์)
app.get('/api/team/:league/:id', async (req, res) => {
  const { league, id } = req.params;
  const key = `${league}:${id}`;
  const cached = teamCache[key];
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return res.json(cached.data);

  try {
    const [info, roster] = await Promise.all([
      getJson(`${API_BASE}/${league}/teams/${id}`),
      getJson(`${API_BASE}/${league}/teams/${id}/roster`).catch(() => ({ athletes: [] }))
    ]);

    const t = info.team || {};
    const players = (roster.athletes || []).map(p => ({
      id: p.id,
      name: p.displayName || p.fullName || '-',
      jersey: p.jersey ?? null,
      position: p.position?.abbreviation || p.position?.displayName || null,
      age: p.age ?? null,
      photo: p.headshot?.href || null,
      injuries: (p.injuries || []).map(i => ({
        status: i.status || i.type?.description || 'Injured',
        detail: i.details?.type || i.longComment || i.shortComment || null,
        returnDate: i.details?.returnDate || null
      }))
    }));

    const name = t.displayName;
    const teamMatches = matches.filter(m => m.homeTeam === name || m.awayTeam === name);

    const data = {
      team: {
        id: Number(t.id),
        name,
        logo: t.logos?.[0]?.href || null,
        location: t.location || null,
        venue: t.franchise?.venue?.fullName || null,
        record: t.record?.items?.[0]?.summary || null
      },
      players,
      injured: players.filter(p => p.injuries.length),
      injuryDataAvailable: players.some(p => p.injuries.length),
      recent: teamMatches.filter(m => m.status === 'FINISHED').slice(-5),
      live: teamMatches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED'),
      upcoming: teamMatches.filter(m => m.status === 'SCHEDULED').slice(0, 5)
    };
    teamCache[key] = { at: Date.now(), data };
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// -----------------------------
// Start
// -----------------------------
loadMatches().finally(() => {
  setInterval(loadMatches, MATCH_REFRESH_MS);
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
});