import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

export default function QueueHistory({ tick }) {
  const [queue, setQueue] = useState(null);
  const [hist, setHist] = useState([]);
  const load = useCallback(() =>
    Promise.all([api('/api/queue'), api('/api/history')])
      .then(([q, h]) => { setQueue(q); setHist(h.data || []); }).catch(() => {}), []);
  useEffect(() => { load(); }, [load, tick]);
  const act = async (url) => { try { await api(url, { method: 'DELETE' }); await load(); } catch (e) { alert(e.message); } };

  return (
    <>
      <div className="box">
        <h3>Queue (FIFO)</h3>
        <p className="small">คิวการแข่งขันที่กำลังรอ/กำลังแข่ง</p>
        <div className="mt">{queue?.next ? <>ถัดไป: <b>{queue.next.homeTeam} vs {queue.next.awayTeam}</b><br />จำนวนในคิว: {queue.size}</> : 'คิวว่าง'}</div>
        <button className="btn" onClick={() => act('/api/queue/process')}>นำรายการถัดไปออกจากคิว</button>
      </div>
      <div className="box">
        <h3>Stack (LIFO) / History</h3>
        <div className="mt" id="history">{hist.length ? hist.slice(0, 8).map((h, i) => <div key={i}>• {h.action}: {h.match.homeTeam} vs {h.match.awayTeam} <span className="small">{h.time}</span></div>) : 'ยังไม่มีประวัติ'}</div>
        <button className="btn" onClick={() => act('/api/history/undo')}>↩ Undo ล่าสุด</button>
      </div>
    </>
  );
}
