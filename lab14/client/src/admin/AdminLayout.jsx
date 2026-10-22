// Каркас веб-версии: боковая панель навигации + верхняя панель (поиск, период, уведомления, профиль)
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { NOTIF_ICON, PERIODS, shortName, timeAgo, todayLong } from '../utils';

const PeriodContext = createContext({ period: 'today', setPeriod: () => {} });
export const usePeriod = () => useContext(PeriodContext);

const MAIN = [
  ['/admin', 'bi-house-door', 'Главная', true],
  ['/admin/objects', 'bi-building', 'Объекты'],
  ['/admin/cameras', 'bi-camera-video', 'Камеры'],
  ['/admin/incidents', 'bi-exclamation-octagon', 'Инциденты'],
  ['/admin/employees', 'bi-people', 'Сотрудники'],
  ['/admin/reports', 'bi-file-earmark-text', 'Отчёты'],
  ['/admin/statistics', 'bi-bar-chart-line', 'Статистика'],
  ['/admin/settings', 'bi-gear', 'Настройки'],
];
const TOOLS = [
  ['/admin/ai', 'bi-person-bounding-box', 'Распознавание (AI)'],
  ['/admin/camera-control', 'bi-sliders', 'Управление камерами'],
  ['/admin/export', 'bi-box-arrow-up', 'Экспорт данных'],
];

function SearchBox() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return undefined; }
    const t = setTimeout(() => api.get(`/search?q=${encodeURIComponent(q.trim())}`).then(setRes).catch(() => setRes(null)), 250);
    return () => clearTimeout(t);
  }, [q]);
  const go = (path) => { setOpen(false); setQ(''); navigate(path); };
  const total = res ? res.employees.length + res.facilities.length + res.violations.length : 0;
  return (
    <div className="topbar-search" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <i className="bi bi-search" />
      <input className="form-control" placeholder="Поиск по сотрудникам, объектам, событиям…" value={q} onChange={(e) => setQ(e.target.value)}
        aria-label="Поиск" />
      {open && res && (
        <div className="search-results shadow">
          {!total && <div className="p-3 small text-secondary">Ничего не найдено</div>}
          {res.violations.length > 0 && <div className="sr-head">События</div>}
          {res.violations.map((v) => (
            <button type="button" key={`v${v.id}`} onMouseDown={() => go(`/admin/incidents/${v.id}`)}>
              <i className="bi bi-exclamation-circle text-danger" />#{v.id} {v.type_name} · {v.facility_name}<span className="ms-auto small text-secondary">{timeAgo(v.detected_at)}</span>
            </button>
          ))}
          {res.facilities.length > 0 && <div className="sr-head">Объекты</div>}
          {res.facilities.map((f) => (
            <button type="button" key={`f${f.id}`} onMouseDown={() => go(`/admin/objects/${f.id}`)}><i className="bi bi-building" />{f.name}<span className="ms-auto small text-secondary">{f.location}</span></button>
          ))}
          {res.employees.length > 0 && <div className="sr-head">Сотрудники</div>}
          {res.employees.map((e) => (
            <button type="button" key={`e${e.id}`} onMouseDown={() => go(`/admin/employees?search=${encodeURIComponent(e.full_name)}`)}><i className="bi bi-person" />{e.full_name}<span className="ms-auto small text-secondary">{e.position}</span></button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsBell() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const load = () => api.get('/notifications').then(setData).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    const onChange = () => load();
    window.addEventListener('sv:notifications', onChange);
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => { clearInterval(t); window.removeEventListener('sv:notifications', onChange); document.removeEventListener('mousedown', close); };
  }, []);
  const openItem = async (n) => {
    if (!n.is_read) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    setOpen(false);
    load();
    if (n.link?.startsWith('/admin')) navigate(n.link);
  };
  return (
    <div className="position-relative" ref={ref}>
      <button type="button" className="topbar-icon" onClick={() => setOpen((o) => !o)} aria-label="Уведомления">
        <i className="bi bi-bell" />{data.unread > 0 && <span className="bell-count">{data.unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown shadow">
          <div className="d-flex align-items-center px-3 py-2 border-bottom">
            <strong className="me-auto">Уведомления</strong>
            <button type="button" className="btn btn-link btn-sm p-0" onClick={() => api.patch('/notifications/read-all').then(load)}>Прочитать все</button>
          </div>
          {data.items.slice(0, 6).map((n) => (
            <button type="button" key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => openItem(n)}>
              <i className={`bi ${NOTIF_ICON[n.type]?.icon}`} style={{ color: NOTIF_ICON[n.type]?.color }} />
              <span className="flex-grow-1 text-start"><span className="d-block fw-semibold small">{n.title}</span>
                <span className="d-block small text-secondary">{n.message}</span></span>
              <span className="small text-secondary text-nowrap">{timeAgo(n.created_at)}</span>
            </button>
          ))}
          <Link className="d-block text-center small py-2 border-top" to="/admin/notifications" onClick={() => setOpen(false)}>Все уведомления</Link>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [period, setPeriod] = useState(() => sessionStorage.getItem('sv_period') || 'today');
  const navigate = useNavigate();
  useEffect(() => sessionStorage.setItem('sv_period', period), [period]);
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      <div className="admin-shell">
        <aside className="sidebar">
          <Link to="/admin" className="brand">
            <span className="brand-icon"><i className="bi bi-shield-fill-check" /></span>
            <span><span className="d-block fw-bold fs-5 text-white">SafeVision</span><span className="d-block small brand-sub">Промышленная безопасность</span></span>
          </Link>
          <nav className="nav flex-column">
            {MAIN.map(([to, icon, label, end]) => (
              <NavLink key={to} to={to} end={end} className="nav-link"><i className={`bi ${icon}`} />{label}</NavLink>
            ))}
            <div className="nav-section">Инструменты</div>
            {TOOLS.map(([to, icon, label]) => (
              <NavLink key={to} to={to} className="nav-link"><i className={`bi ${icon}`} />{label}</NavLink>
            ))}
          </nav>
          <div className="sidebar-user">
            <span className="avatar">{user.full_name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
            <span className="flex-grow-1 small"><span className="d-block text-white fw-semibold">{shortName(user.full_name)}</span>
              <span className="d-block brand-sub">Администратор</span></span>
            <button type="button" className="btn btn-link text-white-50 p-0" title="Выйти" onClick={() => { logout(); navigate('/login'); }}>
              <i className="bi bi-box-arrow-right fs-5" />
            </button>
          </div>
        </aside>
        <div className="admin-main">
          <header className="topbar">
            <SearchBox />
            <div className="period-select">
              <i className="bi bi-calendar3" />
              <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Период">
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.value === 'today' ? `Сегодня, ${todayLong().replace(' г.', '')}` : p.label}</option>)}
              </select>
            </div>
            <div className="ms-auto d-flex align-items-center gap-2">
              <Link to="/m" className="topbar-icon" title="Мобильная версия"><i className="bi bi-phone" /></Link>
              <NotificationsBell />
              <Link to="/admin/settings" className="topbar-icon" title="Настройки"><i className="bi bi-gear" /></Link>
              <button type="button" className="topbar-icon" onClick={fullscreen} title="Во весь экран"><i className="bi bi-fullscreen" /></button>
            </div>
          </header>
          <main className="admin-content"><Outlet /></main>
        </div>
      </div>
    </PeriodContext.Provider>
  );
}
