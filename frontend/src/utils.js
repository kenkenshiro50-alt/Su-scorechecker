import React from 'react';

const pad = n => String(n).padStart(2, '0');
export const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
export const color = n => `hsl(${Math.abs(hash(n)) % 360},55%,42%)`;
export const initials = n => String(n).replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase() || '?';
export const fmtTime = s => new Date(s).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
export const fmtDate = s => new Date(s).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
export const LIVE = ['IN_PLAY', 'LIVE', 'PAUSED'];
export const statusTH = s => ({ FINISHED: 'จบแล้ว', SCHEDULED: 'กำลังจะเริ่ม', IN_PLAY: 'กำลังแข่ง', PAUSED: 'พักครึ่ง', POSTPONED: 'เลื่อน', CANCELLED: 'ยกเลิก' })[s] || s;
export function LiveIcon({ className = '', ...props }) {
  return React.createElement(
    'svg',
    { className: className || 'live-icon', viewBox: '0 0 24 24', 'aria-label': 'LIVE', role: 'img', ...props },
    React.createElement('path', {
      d: 'M2 18h2V9H2v9zm4 0h2V6H6v12zm4 0h2V3h-2v15zm4 0h2V7h-2v11zm4 0h2V0h-2v18z',
      fill: 'currentColor'
    })
  );
}
export function statusInfo(m) {
  if (m.status === 'IN_PLAY') return { k: 'live', t: 'LIVE' };
  if (m.status === 'PAUSED') return { k: 'live', t: 'HT' };
  if (m.status === 'FINISHED') return { k: 'ft', t: 'FT' };
  if (m.status === 'POSTPONED') return { k: 'ns', t: 'เลื่อน' };
  if (m.status === 'CANCELLED') return { k: 'ns', t: 'ยกเลิก' };
  return { k: 'ns', t: fmtTime(m.utcDate) };
}
