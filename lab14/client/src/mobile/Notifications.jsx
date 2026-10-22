// Уведомления: категории «Все / Важные / Системные», отметка прочтения
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorAlert, Loading, useApi } from '../components/ui';
import { NOTIF_ICON, timeAgo } from '../utils';
import { MHeader } from './MobileLayout';

export default function Notifications() {
  const [cat, setCat] = useState('');
  const n = useApi(() => api.get(`/notifications${cat ? `?category=${cat}` : ''}`), [cat]);
  const navigate = useNavigate();
  const open = async (x) => {
    if (!x.is_read) {
      await api.patch(`/notifications/${x.id}/read`).catch(() => {});
      n.setData({ ...n.data, items: n.data.items.map((i) => (i.id === x.id ? { ...i, is_read: true } : i)), unread: n.data.unread - 1 });
    }
    if (x.link?.startsWith('/m/')) navigate(x.link);
  };
  const readAll = () => api.patch('/notifications/read-all').then(n.reload);
  return (
    <div>
      <MHeader title="Уведомления" right={<button type="button" className="btn btn-link btn-sm p-0" onClick={readAll} title="Прочитать все"><i className="bi bi-check2-all fs-5" /></button>} />
      <div className="m-body">
        <div className="m-tabs pill mb-3">
          {[['', 'Все'], ['important', 'Важные'], ['system', 'Системные']].map(([k, l]) => (
            <button key={k} type="button" className={cat === k ? 'active' : ''} onClick={() => setCat(k)}>{l}</button>
          ))}
        </div>
        <ErrorAlert error={n.error} />
        {!n.data ? <Loading /> : n.data.items.length ? n.data.items.map((x) => (
          <button key={x.id} type="button" className={`m-notif ${x.is_read ? '' : 'unread'}`} onClick={() => open(x)}>
            <span className="ic" style={{ background: `${NOTIF_ICON[x.type]?.color}1a`, color: NOTIF_ICON[x.type]?.color }}><i className={`bi ${NOTIF_ICON[x.type]?.icon}`} /></span>
            <span className="flex-grow-1 text-start"><span className="d-block fw-semibold small">{x.title}</span><span className="d-block small text-secondary">{x.message}</span></span>
            <span className="small text-secondary text-nowrap">{timeAgo(x.created_at)}</span>
          </button>
        )) : <Empty icon="bi-bell-slash" text="Уведомлений нет" />}
      </div>
    </div>
  );
}
