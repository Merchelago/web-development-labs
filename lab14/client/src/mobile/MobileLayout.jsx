// Мобильная версия: контейнер под экран смартфона, шапка экрана и нижняя навигация
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export function MHeader({ title, back = true, right }) {
  const navigate = useNavigate();
  return (
    <div className="m-header">
      {back ? <button type="button" className="m-back" onClick={() => navigate(-1)} aria-label="Назад"><i className="bi bi-arrow-left" /></button> : <span className="m-back" />}
      <h1>{title}</h1>
      <span className="m-right">{right}</span>
    </div>
  );
}

const TABS = [
  ['/m', 'bi-house-door-fill', 'Главная', true],
  ['/m/cameras', 'bi-camera-video-fill', 'Камеры'],
  ['/m/tasks', 'bi-clipboard-check-fill', 'Задания'],
  ['/m/profile', 'bi-person-fill', 'Профиль'],
];

export default function MobileLayout() {
  return (
    <div className="m-shell">
      <div className="m-screen">
        <div className="m-content"><Outlet /></div>
        <nav className="m-tabbar">
          {TABS.map(([to, icon, label, end]) => (
            <NavLink key={to} to={to} end={end} className="m-tab"><i className={`bi ${icon}`} /><span>{label}</span></NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
