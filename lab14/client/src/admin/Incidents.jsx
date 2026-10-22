// Журнал нарушений (поиск, фильтры, карточка инцидента) и задачи по их устранению
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api';
import { DetectionOverlay } from '../components/CameraView';
import {
  Empty, ErrorAlert, Field, Loading, Modal, PriorityBadge, SeverityBadge, StatusBadge, TaskBadge, TypeDot, useApi, useToast,
} from '../components/ui';
import { addDays, fmtDate, fmtDateTime, SEVERITY, TASK_STATUS, VIOLATION_STATUS } from '../utils';

const EMPTY_FILTERS = { search: '', type: '', facility_id: '', severity: '', status: '', from: '', to: '' };

export function TaskForm({ initial = {}, onSaved, onCancel }) {
  const toast = useToast();
  const employees = useApi(() => api.get('/employees?active=1&limit=500'), []);
  const facilities = useApi(() => api.get('/objects'), []);
  const [form, setForm] = useState({ title: '', description: '', assignee_id: '', priority: 'medium', due_date: addDays(2), facility_id: '', ...initial });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Укажите название задачи';
    if (!form.assignee_id) errs.assignee_id = 'Выберите исполнителя';
    if (form.due_date && form.due_date < addDays(0)) errs.due_date = 'Срок не может быть в прошлом';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const task = await api.post('/tasks', { ...form, assignee_id: Number(form.assignee_id), facility_id: form.facility_id || undefined });
      toast(`Задача «${task.title}» назначена: ${task.assignee_name}`);
      window.dispatchEvent(new Event('sv:notifications'));
      onSaved(task);
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };
  const emps = employees.data?.items || [];
  const sorted = form.facility_id ? [...emps].sort((a, b) => (b.facility_id === Number(form.facility_id)) - (a.facility_id === Number(form.facility_id))) : emps;
  return (
    <form onSubmit={submit} noValidate>
      {errors.form && <div className="alert alert-danger py-2">{errors.form}</div>}
      <Field label="Название *" error={errors.title}>
        <input className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} onChange={set('title')} />
      </Field>
      <Field label="Описание"><textarea className="form-control" rows={3} value={form.description} onChange={set('description')} /></Field>
      <div className="row g-2">
        <div className="col-md-6">
          <Field label="Исполнитель *" error={errors.assignee_id}>
            <select className={`form-select ${errors.assignee_id ? 'is-invalid' : ''}`} value={form.assignee_id} onChange={set('assignee_id')}>
              <option value="">— выберите —</option>
              {sorted.map((e) => <option key={e.id} value={e.id}>{e.full_name} — {e.position}{e.facility_name ? ` (${e.facility_name})` : ''}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-md-6">
          <Field label="Объект">
            <select className="form-select" value={form.facility_id} onChange={set('facility_id')}>
              <option value="">—</option>
              {(facilities.data || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="col-md-6">
          <Field label="Приоритет">
            <select className="form-select" value={form.priority} onChange={set('priority')}>
              <option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option>
            </select>
          </Field>
        </div>
        <div className="col-md-6">
          <Field label="Срок выполнения" error={errors.due_date}>
            <input type="date" className={`form-control ${errors.due_date ? 'is-invalid' : ''}`} min={addDays(0)} value={form.due_date} onChange={set('due_date')} />
          </Field>
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2">
        {onCancel && <button type="button" className="btn btn-light" onClick={onCancel}>Отмена</button>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="spinner-border spinner-border-sm me-2" />}Создать задачу</button>
      </div>
    </form>
  );
}

function IncidentDetail({ id, onClose, onChanged }) {
  const toast = useToast();
  const v = useApi(() => api.get(`/violations/${id}`), [id]);
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  useEffect(() => { if (v.data) setStatus(v.data.status); }, [v.data]);

  const saveStatus = async () => {
    try {
      await api.patch(`/violations/${id}`, { status });
      toast(`Статус изменён: «${VIOLATION_STATUS[status].label}»`);
      v.reload(); onChanged();
    } catch (e) { toast(e.message, 'error'); }
  };
  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post(`/violations/${id}/comments`, { text: comment });
      setComment('');
      v.reload();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <Modal title={v.data ? `Инцидент #${v.data.id}: ${v.data.type_name}` : 'Инцидент'} onClose={onClose} size="modal-xl">
      {v.error && <ErrorAlert error={v.error} />}
      {!v.data ? <Loading /> : (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="incident-image">
              {v.data.image ? (
                <div className="position-relative">
                  <img src={v.data.image} alt="Фото нарушения" />
                </div>
              ) : <div className="placeholder-thumb big"><i className="bi bi-image" /><div className="small">Фото не прикреплено</div></div>}
            </div>
            {v.data.detections.length > 0 && v.data.camera_id && (
              <CameraSnippet cameraId={v.data.camera_id} highlight={v.data.detections.map((d) => d.id)} />
            )}
          </div>
          <div className="col-lg-6">
            <table className="table table-sm detail-table">
              <tbody>
                <tr><th>Идентификатор</th><td>#{v.data.id}</td></tr>
                <tr><th>Тип нарушения</th><td><TypeDot color={v.data.color} name={v.data.type_name} /></td></tr>
                <tr><th>Объект / зона</th><td>{v.data.facility_name}</td></tr>
                <tr><th>Камера</th><td>{v.data.camera_name || '—'}</td></tr>
                <tr><th>Дата и время</th><td>{fmtDateTime(v.data.detected_at)}</td></tr>
                <tr><th>Уровень опасности</th><td><SeverityBadge severity={v.data.severity} /></td></tr>
                <tr><th>Источник</th><td>{{ camera: 'Камера (AI)', mobile: 'Мобильное приложение', manual: 'Вручную' }[v.data.source]}
                  {v.data.reported_by_name ? ` — ${v.data.reported_by_name}` : ''}</td></tr>
                <tr><th>Нарушитель</th><td>{v.data.employee_name || 'не установлен'}</td></tr>
                <tr><th>Описание</th><td>{v.data.description || '—'}</td></tr>
                <tr><th>Статус</th><td><StatusBadge status={v.data.status} /></td></tr>
              </tbody>
            </table>
            <div className="d-flex gap-2 mb-3">
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Статус">
                {Object.entries(VIOLATION_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <button type="button" className="btn btn-primary text-nowrap" disabled={status === v.data.status} onClick={saveStatus}>Изменить статус</button>
            </div>
            <h6 className="mt-3">Задачи по устранению</h6>
            {v.data.tasks.length ? v.data.tasks.map((t) => (
              <div key={t.id} className="d-flex align-items-center gap-2 small border rounded px-2 py-1 mb-1">
                <span className="flex-grow-1">{t.title}<span className="text-secondary"> — {t.assignee_name}, до {fmtDate(t.due_date)}</span></span>
                <TaskBadge status={t.status} />
              </div>
            )) : <div className="small text-secondary mb-2">Задачи ещё не созданы</div>}
            {!taskOpen ? (
              <button type="button" className="btn btn-outline-primary btn-sm mt-1" onClick={() => setTaskOpen(true)}><i className="bi bi-plus-lg me-1" />Создать задачу</button>
            ) : (
              <div className="border rounded p-3 mt-2 bg-light">
                <TaskForm
                  initial={{ title: `Устранить нарушение: ${v.data.type_name.toLowerCase()} (${v.data.facility_name})`, violation_id: v.data.id,
                    facility_id: String(v.data.facility_id), priority: ['high', 'critical'].includes(v.data.severity) ? 'high' : 'medium',
                    description: v.data.description || '' }}
                  onSaved={() => { setTaskOpen(false); v.reload(); onChanged(); }} onCancel={() => setTaskOpen(false)} />
              </div>
            )}
            <h6 className="mt-4">Комментарии</h6>
            {v.data.comments.map((c) => (
              <div key={c.id} className="comment"><div className="small fw-semibold">{c.author || c.email}<span className="text-secondary fw-normal ms-2">{fmtDateTime(c.created_at)}</span></div>
                <div className="small">{c.text}</div></div>
            ))}
            <form onSubmit={addComment} className="d-flex gap-2 mt-2">
              <input className="form-control form-control-sm" placeholder="Добавить комментарий…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button type="submit" className="btn btn-sm btn-secondary" disabled={!comment.trim()}>Отправить</button>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CameraSnippet({ cameraId, highlight }) {
  const cam = useApi(() => api.get(`/cameras/${cameraId}`), [cameraId]);
  if (!cam.data?.frame) return null;
  return (
    <div className="mt-3">
      <div className="small text-secondary mb-1">Кадр камеры с результатом распознавания</div>
      <div className="camera-frame rounded overflow-hidden">
        <img src={cam.data.frame} alt="" />
        <DetectionOverlay detections={cam.data.detections.filter((d) => highlight.includes(d.id) || !d.is_violation)} />
      </div>
    </div>
  );
}

function Journal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const lookups = useApi(() => api.get('/lookups'), []);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...Object.fromEntries([...params].filter(([k]) => k in EMPTY_FILTERS)) });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const list = useApi(() => api.get(`/violations${qs({ ...filters, page, limit: 15 })}`), [JSON.stringify(filters), page]);
  const set = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / 15)) : 1;

  return (
    <>
      <div className="card mb-3">
        <div className="card-body filters">
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-search" /></span>
            <input className="form-control" placeholder="Поиск: описание, тип, объект, № " value={filters.search} onChange={set('search')} />
          </div>
          <select className="form-select" value={filters.type} onChange={set('type')} aria-label="Тип">
            <option value="">Все типы</option>{lookups.data?.violationTypes.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
          <select className="form-select" value={filters.facility_id} onChange={set('facility_id')} aria-label="Объект">
            <option value="">Все объекты</option>{lookups.data?.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select className="form-select" value={filters.severity} onChange={set('severity')} aria-label="Опасность">
            <option value="">Любая опасность</option>{Object.entries(SEVERITY).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <select className="form-select" value={filters.status} onChange={set('status')} aria-label="Статус">
            <option value="">Все статусы</option>{Object.entries(VIOLATION_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <input type="date" className="form-control" value={filters.from} onChange={set('from')} aria-label="С даты" title="С даты" />
          <input type="date" className="form-control" value={filters.to} onChange={set('to')} aria-label="По дату" title="По дату" />
          <button type="button" className="btn btn-light" onClick={() => { setFilters(EMPTY_FILTERS); setParams({}); }} title="Сбросить"><i className="bi bi-x-lg" /></button>
          <button type="button" className="btn btn-primary text-nowrap" onClick={() => setCreating(true)}><i className="bi bi-plus-lg me-1" />Зарегистрировать</button>
        </div>
      </div>
      <ErrorAlert error={list.error} onRetry={list.reload} />
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 journal">
            <thead><tr><th>№</th><th>Фото</th><th>Тип нарушения</th><th>Объект / зона</th><th>Камера</th><th>Дата и время</th><th>Опасность</th><th>Статус</th><th>Описание</th></tr></thead>
            <tbody>
              {list.data?.items.map((v) => (
                <tr key={v.id} onClick={() => navigate(`/admin/incidents/${v.id}${window.location.search}`)} className="cursor-pointer">
                  <td className="text-secondary">#{v.id}</td>
                  <td>{v.image ? <img src={v.image} alt="" className="table-thumb" /> : <span className="table-thumb placeholder-thumb"><i className="bi bi-image" /></span>}</td>
                  <td><TypeDot color={v.color} name={v.type_name} /></td>
                  <td>{v.facility_name}</td>
                  <td>{v.camera_name || <span className="text-secondary">{v.source === 'mobile' ? 'моб. прил.' : 'вручную'}</span>}</td>
                  <td className="text-nowrap">{fmtDateTime(v.detected_at)}</td>
                  <td><SeverityBadge severity={v.severity} /></td>
                  <td><StatusBadge status={v.status} /></td>
                  <td className="text-truncate" style={{ maxWidth: 260 }}>{v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.loading && !list.data && <Loading />}
          {list.data && !list.data.items.length && <Empty text="Нарушения не найдены" />}
        </div>
        {list.data && (
          <div className="card-footer d-flex align-items-center bg-white">
            <span className="small text-secondary me-auto">Найдено: {list.data.total}</span>
            <button type="button" className="btn btn-sm btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /></button>
            <span className="small mx-2">{page} / {pages}</span>
            <button type="button" className="btn btn-sm btn-light" disabled={page >= pages} onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right" /></button>
          </div>
        )}
      </div>
      {id && <IncidentDetail id={Number(id)} onClose={() => navigate(`/admin/incidents${window.location.search}`)} onChanged={list.reload} />}
      {creating && <CreateViolation lookups={lookups.data} onClose={() => setCreating(false)} onCreated={(v) => { setCreating(false); list.reload(); navigate(`/admin/incidents/${v.id}`); }} />}
    </>
  );
}

function CreateViolation({ lookups, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ type_id: '', facility_id: '', camera_id: '', severity: '', description: '' });
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.type_id) errs.type_id = 'Выберите тип нарушения';
    if (!form.facility_id) errs.facility_id = 'Выберите объект';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (photo) fd.append('photo', photo);
    try {
      const v = await api.upload('/violations', fd);
      toast(`Нарушение #${v.id} зарегистрировано`);
      window.dispatchEvent(new Event('sv:notifications'));
      onCreated(v);
    } catch (err) { setErrors({ form: err.message }); }
  };
  return (
    <Modal title="Регистрация нарушения" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert-danger py-2">{errors.form}</div>}
        <Field label="Тип нарушения *" error={errors.type_id}>
          <select className={`form-select ${errors.type_id ? 'is-invalid' : ''}`} value={form.type_id} onChange={set('type_id')}>
            <option value="">— выберите —</option>{lookups?.violationTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Объект / зона *" error={errors.facility_id}>
          <select className={`form-select ${errors.facility_id ? 'is-invalid' : ''}`} value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value, camera_id: '' })}>
            <option value="">— выберите —</option>{lookups?.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Камера">
          <select className="form-select" value={form.camera_id} onChange={set('camera_id')} disabled={!form.facility_id}>
            <option value="">—</option>{lookups?.cameras.filter((c) => c.facility_id === Number(form.facility_id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Уровень опасности">
          <select className="form-select" value={form.severity} onChange={set('severity')}>
            <option value="">по типу нарушения</option>{Object.entries(SEVERITY).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Описание"><textarea className="form-control" rows={3} value={form.description} onChange={set('description')} /></Field>
        <Field label="Фотография"><input type="file" accept="image/*" className="form-control" onChange={(e) => setPhoto(e.target.files[0])} /></Field>
        <div className="text-end"><button type="submit" className="btn btn-primary">Зарегистрировать</button></div>
      </form>
    </Modal>
  );
}

function TasksTab() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const tasks = useApi(() => api.get(`/tasks${qs({ status })}`), [status]);
  const change = async (t, s) => {
    try { await api.patch(`/tasks/${t.id}`, { status: s }); toast(`Статус задачи: «${TASK_STATUS[s].label}»`); tasks.reload(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <>
      <div className="d-flex gap-2 mb-3">
        <div className="btn-group">
          {[['', 'Все'], ['new', 'Новые'], ['in_progress', 'В работе'], ['done', 'Выполненные']].map(([k, l]) => (
            <button key={k} type="button" className={`btn btn-sm ${status === k ? 'btn-primary' : 'btn-light'}`} onClick={() => setStatus(k)}>{l}</button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm ms-auto" onClick={() => setCreating(true)}><i className="bi bi-plus-lg me-1" />Новая задача</button>
      </div>
      <ErrorAlert error={tasks.error} />
      <div className="card"><div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead><tr><th>Задача</th><th>Исполнитель</th><th>Объект</th><th>Приоритет</th><th>Срок</th><th>Статус</th><th>Результат</th></tr></thead>
          <tbody>
            {tasks.data?.map((t) => (
              <tr key={t.id}>
                <td><div className="fw-semibold small">{t.title}</div>{t.violation_id && <div className="small text-secondary">по нарушению #{t.violation_id} · {t.violation_type}</div>}</td>
                <td className="small">{t.assignee_name}<div className="text-secondary">{t.assignee_position}</div></td>
                <td className="small">{t.facility_name || '—'}</td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td className={`small text-nowrap ${t.overdue ? 'text-danger fw-semibold' : ''}`}>{fmtDate(t.due_date)}{t.overdue && ' (просрочена)'}</td>
                <td>
                  <select className="form-select form-select-sm" value={t.status} onChange={(e) => change(t, e.target.value)} aria-label="Статус задачи">
                    {Object.entries(TASK_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                  </select>
                </td>
                <td className="small text-secondary" style={{ maxWidth: 220 }}>{t.result || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.data && !tasks.data.length && <Empty text="Задач нет" />}
      </div></div>
      {creating && <Modal title="Новая задача" onClose={() => setCreating(false)}><TaskForm onSaved={() => { setCreating(false); tasks.reload(); }} onCancel={() => setCreating(false)} /></Modal>}
    </>
  );
}

export default function Incidents() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'tasks' ? 'tasks' : 'journal';
  return (
    <div>
      <div className="page-head">
        <h4>Инциденты</h4>
        <ul className="nav nav-pills">
          <li className="nav-item"><button type="button" className={`nav-link ${tab === 'journal' ? 'active' : ''}`} onClick={() => setParams({})}>Журнал нарушений</button></li>
          <li className="nav-item"><button type="button" className={`nav-link ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setParams({ tab: 'tasks' })}>Задачи</button></li>
        </ul>
      </div>
      {tab === 'journal' ? <Journal /> : <TasksTab />}
    </div>
  );
}
