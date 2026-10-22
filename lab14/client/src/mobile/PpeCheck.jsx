// «Проверка СИЗ»: инспектор отмечает наличие каски, жилета и очков у сотрудника; при нарушении сервер регистрирует его
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../components/ui';
import { MHeader } from './MobileLayout';

const GEAR = [['has_helmet', 'Защитная каска', 'bi-cone-striped'], ['has_vest', 'Сигнальный жилет', 'bi-person-vcard'], ['has_glasses', 'Защитные очки', 'bi-eyeglasses']];

export default function PpeCheck() {
  const lookups = useApi(() => api.get('/lookups'), []);
  const [facility, setFacility] = useState('');
  const employees = useApi(() => (facility ? api.get(`/lookups/employees?facility_id=${facility}`) : Promise.resolve([])), [facility]);
  const [form, setForm] = useState({ employee_id: '', has_helmet: true, has_vest: true, has_glasses: true, comment: '' });
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!facility) errs.facility = 'Выберите объект';
    if (!form.employee_id) errs.employee = 'Выберите сотрудника';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      setResult(await api.post('/ppe-checks', { ...form, facility_id: Number(facility), employee_id: Number(form.employee_id) }));
    } catch (err) { setErrors({ form: err.message }); }
  };

  if (result) {
    return (
      <div><MHeader title="Проверка СИЗ" />
        <div className="m-body text-center pt-5">
          <i className={`bi ${result.has_violation ? 'bi-exclamation-octagon-fill text-danger' : 'bi-shield-fill-check text-success'}`} style={{ fontSize: 64 }} />
          <h2 className="h5 mt-3">{result.has_violation ? 'Выявлено нарушение' : 'СИЗ в порядке'}</h2>
          <p className="small text-secondary">{result.has_violation ? `Зарегистрировано нарушение №${result.violation_id}, администратор получил уведомление.` : 'Результат проверки сохранён.'}</p>
          <button type="button" className="btn btn-primary w-100 mb-2" onClick={() => { setResult(null); setForm({ ...form, employee_id: '', has_helmet: true, has_vest: true, has_glasses: true, comment: '' }); }}>Следующая проверка</button>
          <Link to="/m" className="btn btn-light w-100">На главную</Link>
        </div>
      </div>
    );
  }
  return (
    <div>
      <MHeader title="Проверка СИЗ" />
      <form className="m-body" onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert-danger py-2 small">{errors.form}</div>}
        <label className="form-label small fw-semibold" htmlFor="pf">Объект</label>
        <select id="pf" className={`form-select ${errors.facility ? 'is-invalid' : ''}`} value={facility} onChange={(e) => { setFacility(e.target.value); setForm({ ...form, employee_id: '' }); }}>
          <option value="">Выберите объект</option>{lookups.data?.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <div className="invalid-feedback">{errors.facility}</div>
        <label className="form-label small fw-semibold mt-3" htmlFor="pe">Сотрудник</label>
        <select id="pe" className={`form-select ${errors.employee ? 'is-invalid' : ''}`} value={form.employee_id} disabled={!facility} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
          <option value="">Выберите сотрудника</option>{employees.data?.map((x) => <option key={x.id} value={x.id}>{x.full_name} — {x.position}</option>)}
        </select>
        <div className="invalid-feedback">{errors.employee}</div>
        <div className="fw-semibold small mt-3 mb-2">Наличие средств защиты</div>
        {GEAR.map(([k, l, icon]) => (
          <label key={k} className={`m-check ${form[k] ? 'ok' : 'bad'}`}>
            <i className={`bi ${icon}`} /><span className="flex-grow-1">{l}</span>
            <span className="small fw-semibold">{form[k] ? 'Есть' : 'Нет'}</span>
            <input type="checkbox" className="form-check-input ms-2" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
          </label>
        ))}
        <label className="form-label small fw-semibold mt-3" htmlFor="pc">Комментарий</label>
        <textarea id="pc" className="form-control" rows={2} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
        <button type="submit" className="btn btn-primary w-100 mt-4 py-2">Сохранить проверку</button>
      </form>
    </div>
  );
}
