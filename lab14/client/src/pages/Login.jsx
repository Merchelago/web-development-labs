import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const DEMO = [
  { email: 'admin@safevision.ru', password: 'admin123', who: 'Администратор (веб-версия)' },
  { email: 'smirnov@safevision.ru', password: 'worker123', who: 'Сотрудник (мобильная версия)' },
  { email: 'ivanova@safevision.ru', password: 'safety123', who: 'Инженер по ОТ (мобильная версия)' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/m'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Введите корректный email';
    if (!form.password) errs.password = 'Введите пароль';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const u = await login(form.email.trim(), form.password);
      const from = location.state?.from;
      navigate(from && (u.role === 'admin' || from.startsWith('/m')) ? from : u.role === 'admin' ? '/admin' : '/m', { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="d-flex align-items-center gap-2 mb-4">
          <span className="brand-icon"><i className="bi bi-shield-fill-check" /></span>
          <div><div className="fs-4 fw-bold">SafeVision</div><div className="small text-secondary">Промышленная безопасность</div></div>
        </div>
        <h1 className="h5 mb-3">Вход в систему</h1>
        {errors.form && <div className="alert alert-danger py-2">{errors.form}</div>}
        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="email">Email</label>
          <input id="email" type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" />
          <div className="invalid-feedback">{errors.email}</div>
        </div>
        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="password">Пароль</label>
          <input id="password" type="password" className={`form-control ${errors.password ? 'is-invalid' : ''}`} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
          <div className="invalid-feedback">{errors.password}</div>
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}Войти
        </button>
        <div className="demo-box mt-4">
          <div className="small fw-semibold mb-2">Демонстрационные учётные записи</div>
          {DEMO.map((d) => (
            <button key={d.email} type="button" className="demo-item" onClick={() => setForm({ email: d.email, password: d.password })}>
              <span>{d.who}</span><span className="text-secondary small">{d.email} / {d.password}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
