// Сотрудники: поиск, фильтры, добавление, редактирование, активность
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api';
import { Empty, ErrorAlert, Field, Loading, Modal, useApi, useToast } from '../components/ui';
import { fmtDate } from '../utils';

const EMPTY = { full_name: '', position: '', department: '', facility_id: '', phone: '', email: '', is_active: true };

function EmployeeForm({ initial, facilities, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.full_name.trim().split(/\s+/).length < 2) errs.full_name = 'Укажите фамилию и имя';
    if (!form.position.trim()) errs.position = 'Укажите должность';
    if (!form.department.trim()) errs.department = 'Укажите подразделение';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Некорректный email';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { ...form, facility_id: form.facility_id || null };
    delete body.id; delete body.facility_name; delete body.violations_30d; delete body.open_tasks; delete body.hired_at;
    try {
      const saved = initial?.id ? await api.put(`/employees/${initial.id}`, body) : await api.post('/employees', body);
      toast(initial?.id ? 'Данные сотрудника сохранены' : `Сотрудник добавлен: ${saved.full_name}`);
      onSaved();
    } catch (err) { setErrors({ form: err.message }); }
  };
  const inp = (k, label, props = {}) => (
    <Field label={label} error={errors[k]}>
      <input className={`form-control ${errors[k] ? 'is-invalid' : ''}`} value={form[k] || ''} onChange={set(k)} {...props} />
    </Field>
  );
  return (
    <Modal title={initial?.id ? 'Редактирование сотрудника' : 'Новый сотрудник'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert-danger py-2">{errors.form}</div>}
        {inp('full_name', 'ФИО *')}
        <div className="row g-2"><div className="col-md-6">{inp('position', 'Должность *')}</div><div className="col-md-6">{inp('department', 'Подразделение *')}</div></div>
        <Field label="Производственный объект">
          <select className="form-select" value={form.facility_id || ''} onChange={set('facility_id')}>
            <option value="">—</option>{facilities?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <div className="row g-2"><div className="col-md-6">{inp('phone', 'Телефон', { placeholder: '+7 (___) ___-__-__' })}</div><div className="col-md-6">{inp('email', 'Email', { type: 'email' })}</div></div>
        <div className="form-check form-switch mb-3">
          <input className="form-check-input" type="checkbox" id="active" checked={form.is_active} onChange={set('is_active')} />
          <label className="form-check-label" htmlFor="active">Активен (работает на предприятии)</label>
        </div>
        <div className="text-end"><button type="submit" className="btn btn-primary">Сохранить</button></div>
      </form>
    </Modal>
  );
}

export default function Employees() {
  const [params] = useSearchParams();
  const toast = useToast();
  const [filters, setFilters] = useState({ search: params.get('search') || '', facility_id: '', active: '' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const lookups = useApi(() => api.get('/lookups'), []);
  const list = useApi(() => api.get(`/employees${qs({ ...filters, page, limit: 20 })}`), [JSON.stringify(filters), page]);
  const set = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / 20)) : 1;
  const remove = async (e) => {
    if (!window.confirm(`Удалить сотрудника «${e.full_name}»?`)) return;
    try { await api.del(`/employees/${e.id}`); toast('Сотрудник удалён'); list.reload(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <div>
      <div className="page-head">
        <h4>Сотрудники</h4>
        <button type="button" className="btn btn-primary ms-auto" onClick={() => setEditing({})}><i className="bi bi-person-plus me-1" />Добавить сотрудника</button>
      </div>
      <div className="card mb-3"><div className="card-body filters">
        <div className="input-group"><span className="input-group-text"><i className="bi bi-search" /></span>
          <input className="form-control" placeholder="ФИО, должность или подразделение" value={filters.search} onChange={set('search')} /></div>
        <select className="form-select" value={filters.facility_id} onChange={set('facility_id')} aria-label="Объект">
          <option value="">Все объекты</option>{lookups.data?.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="form-select" value={filters.active} onChange={set('active')} aria-label="Статус">
          <option value="">Все</option><option value="1">Активные</option><option value="0">Неактивные</option>
        </select>
      </div></div>
      <ErrorAlert error={list.error} onRetry={list.reload} />
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead><tr><th>ФИО</th><th>Должность</th><th>Подразделение</th><th>Объект</th><th>Контакты</th><th>Нарушений (30 дн.)</th><th>Статус</th><th /></tr></thead>
            <tbody>
              {list.data?.items.map((e) => (
                <tr key={e.id}>
                  <td className="fw-semibold">{e.full_name}<div className="small text-secondary fw-normal">с {fmtDate(e.hired_at)}</div></td>
                  <td className="small">{e.position}</td><td className="small">{e.department}</td><td className="small">{e.facility_name || '—'}</td>
                  <td className="small">{e.phone}<div className="text-secondary">{e.email}</div></td>
                  <td>{e.violations_30d > 0 ? <span className="badge badge-soft-danger">{e.violations_30d}</span> : <span className="text-secondary">0</span>}</td>
                  <td>{e.is_active ? <span className="badge badge-soft-success">Активен</span> : <span className="badge badge-soft-secondary">Неактивен</span>}</td>
                  <td className="text-nowrap">
                    <button type="button" className="btn btn-sm btn-light me-1" onClick={() => setEditing(e)} title="Редактировать"><i className="bi bi-pencil" /></button>
                    <button type="button" className="btn btn-sm btn-light text-danger" onClick={() => remove(e)} title="Удалить"><i className="bi bi-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.loading && !list.data && <Loading />}
          {list.data && !list.data.items.length && <Empty text="Сотрудники не найдены" />}
        </div>
        {list.data && (
          <div className="card-footer bg-white d-flex align-items-center">
            <span className="small text-secondary me-auto">Всего: {list.data.total}</span>
            <button type="button" className="btn btn-sm btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /></button>
            <span className="small mx-2">{page} / {pages}</span>
            <button type="button" className="btn btn-sm btn-light" disabled={page >= pages} onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right" /></button>
          </div>
        )}
      </div>
      {editing && <EmployeeForm initial={editing} facilities={lookups.data?.facilities} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
    </div>
  );
}
