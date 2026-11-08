/* ================= Helpers ================= */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
const color = n => `hsl(${Math.abs(hash(n)) % 360},55%,42%)`;
const initials = n => String(n).replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase() || '?';
const fmtTime = s => new Date(s).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const fmtDate = s => new Date(s).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });

function crest(name, logo, big) {
  const img = logo
    ? `<img src="${esc(logo)}" alt="" loading="lazy" onerror="this.parentNode.classList.remove('has-logo');this.remove()">`
    : '';
  return `<span class="crest ${logo ? 'has-logo' : ''} ${big ? 'lg' : ''}" style="background:${color(name)}">${esc(initials(name))}${img}</span>`;
}

function statusTH(s) {
  return ({ FINISHED: 'จบแล้ว', SCHEDULED: 'กำลังจะเริ่ม', TIMED: 'กำลังจะเริ่ม', IN_PLAY: 'กำลังแข่ง', PAUSED: 'พักครึ่ง', POSTPONED: 'เลื่อน', CANCELLED: 'ยกเลิก', SUSPENDED: 'ระงับ' })[s] || s;
}
function statusInfo(m) {
  switch (m.status) {
    case 'IN_PLAY': case 'LIVE': return { k: 'live', t: 'LIVE' };
    case 'PAUSED': return { k: 'live', t: 'HT' };
    case 'FINISHED': case 'AWARDED': return { k: 'ft', t: 'FT' };
    case 'POSTPONED': return { k: 'ns', t: 'เลื่อน' };
    case 'CANCELLED': case 'SUSPENDED': return { k: 'ns', t: 'ยกเลิก' };
    default: return { k: 'ns', t: fmtTime(m.utcDate) };
  }
}

async function api(url, opt = {}) {
  const r = await fetch(url, opt);
  let d = {};
  try { d = await r.json(); } catch { /* ignore */ }
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

function loadFavs() {
  try { return JSON.parse(localStorage.getItem('favs') || '[]'); } catch { return []; }
}
function saveFavs() {
  try { localStorage.setItem('favs', JSON.stringify(S.favs)); } catch { /* ignore */ }
}

/* ================= State ================= */
const S = {
  matches: [],
  byId: new Map(),
  leagues: [],
  league: 'all',
  date: dkey(new Date()),
  filter: 'all',
  query: '',
  favs: loadFavs(),
  closed: new Set()
};

/* ================= Matches ================= */
async function loadLeagues() {
  const d = await api('/api/leagues');
  S.leagues = d.data || [];
}

async function loadMatches() {
  const d = await api('/api/matches');
  S.matches = d.data || [];
  S.byId = new Map(S.matches.map(m => [m.id, m]));
  $('#source').textContent = 'แหล่งข้อมูล: ' + (d.source || '-');
  pickDefaultDate();
  render();
}

function pickDefaultDate() {
  const keys = [...new Set(S.matches.map(m => dkey(new Date(m.utcDate))))];
  const today = dkey(new Date());
  if (S.date && keys.includes(S.date)) return;
  if (!keys.length || keys.includes(today)) { S.date = today; return; }
  const now = Date.now();
  keys.sort((a, b) => Math.abs(new Date(a + 'T12:00:00') - now) - Math.abs(new Date(b + 'T12:00:00') - now));
  S.date = keys[0];
}

function renderDates() {
  const today = dkey(new Date());
  const keys = new Set(S.matches.map(m => dkey(new Date(m.utcDate))));
  keys.add(today);
  $('#dates').innerHTML = [...keys].sort().map(k => {
    const d = new Date(k + 'T00:00:00');
    return `<div class="date ${k === S.date ? 'active' : ''}" data-d="${k}">
      <small>${k === today ? 'วันนี้' : d.toLocaleDateString('th-TH', { weekday: 'short' })}</small>
      <b>${d.getDate()}/${d.getMonth() + 1}</b></div>`;
  }).join('');
  const act = $('#dates .active');
  if (act) act.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function renderLeagues() {
  const chips = [`<div class="chip ${S.league === 'all' ? 'active' : ''}" data-l="all">ทุกลีก</div>`]
    .concat(S.leagues.map(l =>
      `<div class="chip ${S.league === l.code ? 'active' : ''}" data-l="${esc(l.code)}">${esc(l.name)}</div>`));
  $('#leagues').innerHTML = chips.join('');
}

function renderFilters() {
  const f = [['all', 'ทั้งหมด'], ['live', '🔴 สด'], ['ft', 'จบแล้ว'], ['ns', 'ยังไม่แข่ง'], ['fav', '⭐ ทีมโปรด']];
  $('#filters').innerHTML = f.map(([k, l]) =>
    `<div class="chip ${S.filter === k ? 'active' : ''}" data-f="${k}">${l}</div>`).join('');
}

function matchRow(m) {
  const st = statusInfo(m);
  const hasScore = m.homeScore != null && m.awayScore != null;
  const fav = S.favs.includes(m.homeTeam) || S.favs.includes(m.awayTeam);
  return `<div class="match" data-id="${m.id}">
    <div class="status ${st.k === 'live' ? 'live' : ''}">${esc(st.t)}</div>
    <div class="team home">${crest(m.homeTeam, m.homeTeamLogo)}<span class="n">${esc(m.homeTeam)}</span></div>
    <div class="score ${st.k === 'live' ? 'live' : st.k === 'ns' ? 'ns' : ''}">${hasScore ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</div>
    <div class="team">${crest(m.awayTeam, m.awayTeamLogo)}<span class="n">${esc(m.awayTeam)}</span></div>
    <div class="star ${fav ? 'on' : ''}" data-star="${m.id}" title="ทีมโปรด">★</div>
  </div>`;
}

function renderMatches() {
  const q = S.query.trim().toLowerCase();
  const ms = S.matches
    .filter(m => dkey(new Date(m.utcDate)) === S.date)
    .filter(m => S.league === 'all' || m.leagueCode === S.league)
    .filter(m => {
      if (S.filter === 'live') return ['IN_PLAY', 'LIVE', 'PAUSED'].includes(m.status);
      if (S.filter === 'ft') return ['FINISHED', 'AWARDED'].includes(m.status);
      if (S.filter === 'ns') return ['SCHEDULED', 'TIMED'].includes(m.status);
      if (S.filter === 'fav') return S.favs.includes(m.homeTeam) || S.favs.includes(m.awayTeam);
      return true;
    })
    .filter(m => !q || m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q));

  if (!ms.length) { $('#list').innerHTML = '<div class="empty">ไม่พบแมตช์</div>'; return; }

  const groups = new Map();
  ms.forEach(m => {
    if (!groups.has(m.leagueCode)) groups.set(m.leagueCode, { name: m.league, rows: [] });
    groups.get(m.leagueCode).rows.push(m);
  });

  $('#list').innerHTML = [...groups].map(([code, g]) => `
    <div class="league ${S.closed.has(code) ? 'closed' : ''}">
      <div class="lh" data-lg="${esc(code)}">
        <div><b>${esc(g.name)}</b><small>${g.rows.length} แมตช์</small></div>
        <span class="arrow">▾</span>
      </div>
      <div class="matches">${g.rows.map(matchRow).join('')}</div>
    </div>`).join('');
}

function render() {
  renderDates();
  renderLeagues();
  renderFilters();
  renderMatches();
}

/* ================= Standings ================= */
function standingsCode() { return S.league === 'all' ? 'eng.1' : S.league; }

async function loadStandings() {
  const code = standingsCode();
  const algo = $('#sort').value;
  const lg = S.leagues.find(l => l.code === code);
  $('#stTitle').textContent = '🏆 ' + (lg ? lg.name : 'ตารางคะแนน');
  try {
    const d = await api(`/api/standings?league=${encodeURIComponent(code)}&sort=${algo}`);
    if (!d.data.length) {
      $('#table').innerHTML = '<div class="empty">ไม่มีตารางคะแนนของลีกนี้</div>';
      $('#sorttime').textContent = '';
      return;
    }
    const n = d.data.length;
    $('#table').innerHTML = `<table><thead><tr><th>#</th><th>ทีม</th><th>แข่ง</th><th>GD</th><th>Pts</th></tr></thead><tbody>${
      d.data.map((t, i) => `<tr class="${i < 4 ? 'cl' : ''} ${n > 10 && i >= n - 3 ? 'rel' : ''}">
        <td>${i + 1}</td>
        <td><div class="tt link" ${t.teamId ? `data-team="${t.teamId}" data-lg="${esc(code)}"` : ''}>${crest(t.team, t.logo)}<span>${esc(t.team)}</span></div></td>
        <td>${t.playedGames}</td><td>${t.goalDifference}</td><td><b>${t.points}</b></td></tr>`).join('')
    }</tbody></table>`;
    $('#sorttime').textContent = `ใช้ ${d.algorithm} Sort: ${d.ms} ms`;
  } catch (e) {
    $('#table').innerHTML = `<div class="empty">โหลดตารางไม่ได้: ${esc(e.message)}</div>`;
  }
}

/* ================= Queue / History ================= */
async function loadQueue() {
  const d = await api('/api/queue');
  $('#queue').innerHTML = d.next
    ? `ถัดไป: <b>${esc(d.next.homeTeam)} vs ${esc(d.next.awayTeam)}</b><br>จำนวนในคิว: ${d.size}`
    : 'คิวว่าง';
}

async function loadHistory() {
  const d = await api('/api/history');
  const rows = d.data || [];
  $('#history').innerHTML = rows.length
    ? rows.slice(0, 8).map(h => `<div>• ${esc(h.action)}: ${esc(h.match.homeTeam)} vs ${esc(h.match.awayTeam)} <span class="small">${esc(h.time)}</span></div>`).join('')
    : 'ยังไม่มีประวัติ';
}

/* ================= Dialog ================= */
function openDialog(title, html) {
  $('#dialogTitle').textContent = title;
  $('#matchDetails').innerHTML = html;
  const dlg = $('#matchDialog');
  if (!dlg.open) dlg.showModal();
}

function playerRows(list) {
  return list.map(p => `<div class="pl"><b>${esc(p.jersey ?? '')}</b><span>${esc(p.name)}</span><span class="pos">${esc(p.position ?? '')}</span></div>`).join('');
}

function lineupHTML(side) {
  if (!side) return '';
  return `<div class="lu">
    <h4>${crest(side.team, side.logo)}<span>${esc(side.team)}</span>
      ${side.formation ? `<span class="badge">แผน ${esc(side.formation)}</span>` : ''}</h4>
    <div class="small">ตัวจริง</div>${playerRows(side.starters)}
    <div class="small" style="margin-top:8px">ตัวสำรอง</div>${playerRows(side.substitutes)}
  </div>`;
}

function matchHeader(m) {
  const st = statusInfo(m);
  const hasScore = m.homeScore != null && m.awayScore != null;
  return `<div class="match-teams">
      <div class="match-team ${m.homeTeamId ? 'link' : ''}" ${m.homeTeamId ? `data-team="${m.homeTeamId}" data-lg="${esc(m.leagueCode)}"` : ''}>${crest(m.homeTeam, m.homeTeamLogo, true)}<span>${esc(m.homeTeam)}</span></div>
      <div class="match-score">${hasScore ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</div>
      <div class="match-team ${m.awayTeamId ? 'link' : ''}" ${m.awayTeamId ? `data-team="${m.awayTeamId}" data-lg="${esc(m.leagueCode)}"` : ''}>${crest(m.awayTeam, m.awayTeamLogo, true)}<span>${esc(m.awayTeam)}</span></div>
    </div>
    <div class="match-meta"><span>${esc(m.league)} · ${fmtDate(m.utcDate)}</span>
      <span class="badge ${st.k === 'live' ? 'live' : ''}">${statusTH(m.status)}</span></div>`;
}

async function openMatch(id) {
  const m = S.byId.get(Number(id));
  if (!m) return;
  openDialog('รายละเอียดการแข่งขัน', matchHeader(m) + '<div class="empty">กำลังโหลดแผนการเล่น...</div>');
  api('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id }) })
    .then(loadHistory).catch(() => {});
  try {
    const d = await api('/api/match/' + m.id);
    const body = d.available
      ? lineupHTML(d.home) + lineupHTML(d.away)
      : '<div class="empty">ยังไม่มีข้อมูลแผนการเล่น/ตัวจริงของแมตช์นี้</div>';
    openDialog('รายละเอียดการแข่งขัน', matchHeader(m) + body);
  } catch (e) {
    openDialog('รายละเอียดการแข่งขัน', matchHeader(m) + `<div class="empty">${esc(e.message)}</div>`);
  }
}

function miniMatch(m) {
  const has = m.homeScore != null && m.awayScore != null;
  return `<div class="pl link" data-open="${m.id}"><span>${esc(m.homeTeam)} ${has ? `${m.homeScore}-${m.awayScore}` : 'vs'} ${esc(m.awayTeam)}</span><span class="pos">${fmtDate(m.utcDate)}</span></div>`;
}

async function openTeam(league, id) {
  openDialog('ข้อมูลทีม', '<div class="empty">กำลังโหลด...</div>');
  try {
    const d = await api(`/api/team/${encodeURIComponent(league)}/${id}`);
    const t = d.team;
    const injured = d.injured.length
      ? d.injured.map(p => `<div class="pl warn"><span>${esc(p.name)}</span><span class="pos">${esc(p.injuries[0].status)}${p.injuries[0].detail ? ' · ' + esc(p.injuries[0].detail) : ''}</span></div>`).join('')
      : `<div class="small">${d.injuryDataAvailable ? 'ไม่มีนักเตะบาดเจ็บ' : 'ไม่มีข้อมูลการบาดเจ็บจากแหล่งข้อมูลนี้'}</div>`;
    const sec = (title, list) => list.length ? `<div class="lu"><h4>${title}</h4>${list.map(miniMatch).join('')}</div>` : '';
    openDialog(t.name || 'ข้อมูลทีม', `
      <div class="match-team" style="margin-bottom:12px">${crest(t.name || '?', t.logo, true)}
        <span>${esc(t.name)}</span>
        <span class="small">${esc(t.venue || '')} ${t.record ? '· ' + esc(t.record) : ''}</span></div>
      ${sec('🔴 กำลังแข่ง', d.live)}
      ${sec('แมตช์ถัดไป', d.upcoming)}
      ${sec('ผลล่าสุด', d.recent)}
      <div class="lu"><h4>🩹 นักเตะบาดเจ็บ</h4>${injured}</div>
      <div class="lu"><h4>รายชื่อนักเตะ (${d.players.length})</h4>${d.players.length ? playerRows(d.players) : '<div class="small">ไม่มีข้อมูล</div>'}</div>`);
  } catch (e) {
    openDialog('ข้อมูลทีม', `<div class="empty">โหลดข้อมูลทีมไม่ได้: ${esc(e.message)}</div>`);
  }
}

/* ================= Events ================= */
document.addEventListener('click', e => {
  const t = e.target;
  const el = sel => t.closest(sel);

  if (el('[data-star]')) {
    const m = S.byId.get(Number(el('[data-star]').dataset.star));
    if (m) {
      const on = S.favs.includes(m.homeTeam) || S.favs.includes(m.awayTeam);
      S.favs = on
        ? S.favs.filter(n => n !== m.homeTeam && n !== m.awayTeam)
        : [...new Set([...S.favs, m.homeTeam, m.awayTeam])];
      saveFavs();
      renderMatches();
    }
    return;
  }
  if (el('[data-team]')) { const x = el('[data-team]'); openTeam(x.dataset.lg, x.dataset.team); return; }
  if (el('[data-open]')) { openMatch(el('[data-open]').dataset.open); return; }
  if (el('.match')) { openMatch(el('.match').dataset.id); return; }
  if (el('.lh')) {
    const code = el('.lh').dataset.lg;
    S.closed.has(code) ? S.closed.delete(code) : S.closed.add(code);
    renderMatches();
    return;
  }
  if (el('.date')) { S.date = el('.date').dataset.d; render(); return; }
  if (el('[data-f]')) { S.filter = el('[data-f]').dataset.f; renderFilters(); renderMatches(); return; }
  if (el('[data-l]')) { S.league = el('[data-l]').dataset.l; render(); loadStandings(); return; }
});

$('#q').addEventListener('input', e => { S.query = e.target.value; renderMatches(); });
$('#sort').addEventListener('change', loadStandings);
$('#btnClose').addEventListener('click', () => $('#matchDialog').close());
$('#matchDialog').addEventListener('click', e => { if (e.target.id === 'matchDialog') e.target.close(); });

$('#btnQueue').addEventListener('click', async () => {
  try { await api('/api/queue/process', { method: 'DELETE' }); await Promise.all([loadQueue(), loadHistory()]); }
  catch (err) { alert(err.message); }
});
$('#btnUndo').addEventListener('click', async () => {
  try { await api('/api/history/undo', { method: 'DELETE' }); await loadHistory(); }
  catch (err) { alert(err.message); }
});

async function loadAll() {
  const btn = $('#reload');
  btn.classList.add('spin');
  try {
    await Promise.all([loadMatches(), loadQueue(), loadHistory()]);
    await loadStandings();
  } catch (err) {
    $('#list').innerHTML = `<div class="empty">เกิดข้อผิดพลาด: ${esc(err.message)}</div>`;
  } finally {
    btn.classList.remove('spin');
  }
}
$('#reload').addEventListener('click', loadAll);

(async function init() {
  try { await loadLeagues(); } catch { /* ignore */ }
  await loadAll();
  setInterval(() => { loadMatches().then(loadQueue).catch(() => {}); }, 60 * 1000);
})();