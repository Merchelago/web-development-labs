import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { MHeader } from './MobileLayout';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div>
      <MHeader title="Профиль" back={false} />
      <div className="m-body">
        <div className="text-center mb-4">
          <span className="avatar lg">{user.full_name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
          <h2 className="h5 mt-2 mb-0">{user.full_name}</h2>
          <div className="small text-secondary">{user.position}</div>
          <div className="small text-secondary">{user.department}{user.facility_name ? ` · ${user.facility_name}` : ''}</div>
        </div>
        <Link to="/m/stats" className="m-card-link"><i className="bi bi-graph-up-arrow text-success" /><span className="flex-grow-1">Моя статистика</span><i className="bi bi-chevron-right" /></Link>
        <Link to="/m/notifications" className="m-card-link"><i className="bi bi-bell text-primary" /><span className="flex-grow-1">Уведомления</span><i className="bi bi-chevron-right" /></Link>
        <Link to="/m/training" className="m-card-link"><i className="bi bi-journal-text text-indigo" /><span className="flex-grow-1">Инструкции по охране труда</span><i className="bi bi-chevron-right" /></Link>
        {user.role === 'admin' && <Link to="/admin" className="m-card-link"><i className="bi bi-display" /><span className="flex-grow-1">Веб-версия администратора</span><i className="bi bi-chevron-right" /></Link>}
        <div className="small text-secondary mt-3 mb-2">{user.email} · {user.role === 'admin' ? 'администратор' : 'сотрудник'}</div>
        <button type="button" className="btn btn-outline-danger w-100" onClick={() => { logout(); navigate('/login'); }}><i className="bi bi-box-arrow-right me-1" />Выйти</button>
      </div>
    </div>
  );
}
