import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../components/ui';
import { shortName } from '../utils';

const QUICK = [
  ['/m/tasks', 'bi-list-task', 'Мои задания', 'blue'],
  ['/m/report', 'bi-exclamation-circle-fill', 'Сообщить о нарушении', 'red'],
  ['/m/ppe-check', 'bi-shield-fill-check', 'Проверка СИЗ', 'green'],
  ['/m/training', 'bi-journal-text', 'Новости и инструкции', 'indigo'],
];

export default function Home() {
  const { user } = useAuth();
  const notif = useApi(() => api.get('/notifications?unread=1'), []);
  const tasks = useApi(() => api.get('/tasks?mine=1'), []);
  const active = tasks.data?.filter((t) => t.status !== 'done').length;
  return (
    <div className="m-home">
      <div className="m-header home">
        <span className="d-flex align-items-center gap-2"><span className="brand-icon sm"><i className="bi bi-shield-fill-check" /></span><strong>SafeVision</strong></span>
        <Link to="/m/notifications" className="m-bell" aria-label="Уведомления"><i className="bi bi-bell" />{notif.data?.unread > 0 && <span className="bell-count">{notif.data.unread}</span>}</Link>
      </div>
      <div className="m-hero"><img src="/media/facility.png" alt="Производственный цех" />
        <div className="m-hero-text"><div className="small opacity-75">Здравствуйте,</div><div className="fw-bold">{shortName(user.full_name)}</div>
          <div className="small opacity-75">{user.position}{user.facility_name ? ` · ${user.facility_name}` : ''}</div></div></div>
      <div className="m-quick">
        {QUICK.map(([to, icon, label, tone]) => (
          <Link key={to} to={to} className={`m-quick-btn tone-${tone}`}>
            <i className={`bi ${icon}`} /><span>{label}</span>
            {to === '/m/tasks' && active > 0 && <span className="badge bg-primary rounded-pill">{active}</span>}
          </Link>
        ))}
      </div>
      <Link to="/m/stats" className="m-card-link"><i className="bi bi-graph-up-arrow text-success" /><span className="flex-grow-1">Моя статистика безопасности</span><i className="bi bi-chevron-right" /></Link>
      <Link to="/m/notifications" className="m-card-link"><i className="bi bi-bell text-primary" /><span className="flex-grow-1">Уведомления{notif.data?.unread ? ` (${notif.data.unread} новых)` : ''}</span><i className="bi bi-chevron-right" /></Link>
    </div>
  );
}
