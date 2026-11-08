export const Loading = () => <div className="empty">กำลังโหลด...</div>;
export const Empty = ({ text = 'ไม่พบข้อมูล' }) => <div className="empty">{text}</div>;
export const ErrorBox = ({ message, onRetry }) => (
  <div className="empty">เกิดข้อผิดพลาด: {message}
    {onRetry && <div><button className="btn" style={{ width: 'auto', marginTop: 10 }} onClick={onRetry}>ลองใหม่</button></div>}
  </div>
);
