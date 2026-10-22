// Производственные объекты: карточки, подробная информация (камеры, нарушения, задачи), добавление и редактирование
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorAlert, Field, Loading, Modal, StatusBadge, TaskBadge, useApi, useToast } from '../components/ui';
import { FACILITY_TYPE, fmtDate, timeAgo } from '../utils';

function ObjectForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const employees = useApi(() => api.get('/employees?active=1&limit=500'), []);
  const [form, setForm] = useState({ name: '', type: 'workshop', description: '', location: '', responsible_id: '', ...initial });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: 'Укажите название' }); return; }
    const body = { name: form.name, type: form.type, description: form.description, location: form.location, responsible_id: form.responsible_id || null };
    try {
      const saved = initial?.id ? await api.put(`/objects/${initial.id}`, body) : await api.post('/objects', body);
      toast(initial?.id ? 'Объект сохранён' : 'Объект добавлен');
      onSaved(saved);
    } catch (err) { setErrors({ form: err.message }); }
  };
  return (
    <Modal title={initial?.id ? 'Редактирование объекта' : 'Новый объект'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert-danger py-2">{errors.form}</div>}
        <Field label="Название *" error={errors.name}><input className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={set('name')} /></Field>
        <Field label="Тип">
          <select className="form-select" value={form.type} onChange={set('type')}>{Object.entries(FACILITY_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Местоположение"><input className="form-control" value={form.location || ''} onChange={set('location')} /></Field>
        <Field label="Ответственный">
          <select className="form-select" value={form.responsible_id || ''} onChange={set('responsible_id')}>
            <option value="">—</option>{employees.data?.items.map((e) => <option key={e.id} value={e.id}>{e.full_name} — {e.position}</option>)}
          </select>
        </Field>
        <Field label="Описание"><textarea className="form-control" rows={3} value={form.description || ''} onChange={set('description')} /></Field>
        <div className="text-end"><button type="submit" className="btn btn-primary">Сохранить</button></div>
      </form>
    </Modal>
  );
}

function ObjectDetail({ id, onEdit, onDeleted }) {
  const toast = useToast();
  const o = useApi(() => api.get(`/objects/${id}`), [id]);
  if (o.error) return <ErrorAlert error={o.error} />;
  if (!o.data) return <Loading />;
  const f = o.data;
  const remove = async () => {
    if (!window.confirm(`Удалить объект «${f.name}»?`)) return;
    try { await api.del(`/objects/${f.id}`); toast('Объект удалён'); onDeleted(); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-start mb-3">
          <div className="me-auto"><h5 className="mb-0">{f.name}</h5><div className="small text-secondary">{FACILITY_TYPE[f.type]} · {f.location}</div></div>
          <button type="button" className="btn btn-sm btn-light me-2" onClick={() => onEdit(f)}><i className="bi bi-pencil" /></button>
          <button type="button" className="btn btn-sm btn-light text-danger" onClick={remove}><i className="bi bi-trash" /></button>
        </div>
        <p className="small">{f.description}</p>
        <div className="small mb-3"><i className="bi bi-person-badge me-1" />Ответственный: <strong>{f.responsible_name || 'не назначен'}</strong></div>
        <h6>Камеры ({f.cameras.length})</h6>
        <div className="row g-2 mb-3">
          {f.cameras.map((c) => (
            <div key={c.id} className="col-6 col-xl-4">
              <Link to="/admin/cameras" state={{ cameraId: c.id }} className="cam-mini">
                <img src={c.frame} alt="" className={c.status !== 'online' ? 'off' : ''} />
                <span className="small fw-semibold">{c.name}</span>
                <span className={`small ${c.status === 'online' ? 'text-success' : 'text-danger'}`}>{c.status === 'online' ? 'онлайн' : 'не в сети'}</span>
              </Link>
            </div>
          ))}
        </div>
        <h6>Последние нарушения</h6>
        {f.violations.length ? f.violations.map((v) => (
          <Link key={v.id} to={`/admin/incidents/${v.id}`} className="d-flex align-items-center gap-2 small py-1 border-bottom text-reset">
            <span className="dot" style={{ background: v.color }} /><span className="me-auto">#{v.id} {v.type_name}</span>
            <span className="text-secondary">{timeAgo(v.detected_at)}</span><StatusBadge status={v.status} />
          </Link>
        )) : <Empty text="Нарушений нет" />}
        <h6 className="mt-3">Задачи</h6>
        {f.tasks.length ? f.tasks.map((t) => (
          <div key={t.id} className="d-flex align-items-center gap-2 small py-1 border-bottom">
            <span className="me-auto">{t.title}<span className="text-secondary"> — {t.assignee_name}, до {fmtDate(t.due_date)}</span></span><TaskBadge status={t.status} />
          </div>
        )) : <Empty text="Задач нет" />}
      </div>
    </div>
  );
}

export default function Objects() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const list = useApi(() => api.get(`/objects${search ? `?search=${encodeURIComponent(search)}` : ''}`), [search]);
  const [editing, setEditing] = useState(null);
  const selected = Number(id) || list.data?.[0]?.id;
  return (
    <div>
      <div className="page-head">
        <h4>Производственные объекты</h4>
        <input className="form-control w-auto" placeholder="Поиск объекта" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><i className="bi bi-plus-lg me-1" />Добавить объект</button>
      </div>
      <ErrorAlert error={list.error} onRetry={list.reload} />
      <div className="row g-3">
        <div className="col-lg-5">
          {list.data?.map((f) => (
            <button key={f.id} type="button" className={`card object-card w-100 text-start mb-2 ${selected === f.id ? 'active' : ''}`} onClick={() => navigate(`/admin/objects/${f.id}`)}>
              <div className="card-body">
                <div className="d-flex align-items-center mb-1">
                  <span className="obj-icon me-2"><i className={`bi ${f.type === 'warehouse' ? 'bi-box-seam' : f.type === 'territory' ? 'bi-signpost-split' : 'bi-gear-wide-connected'}`} /></span>
                  <span className="fw-semibold me-auto">{f.name}</span>
                  {f.open_violations > 0 && <span className="badge badge-soft-danger">{f.open_violations} открытых</span>}
                </div>
                <div className="small text-secondary mb-2">{f.description}</div>
                <div className="d-flex flex-wrap gap-3 small">
                  <span><i className="bi bi-camera-video me-1" />{f.cameras_online}/{f.cameras_total} камер</span>
                  <span><i className="bi bi-people me-1" />{f.employees} сотр.</span>
                  <span><i className="bi bi-exclamation-triangle me-1" />{f.violations_30d} за 30 дн.</span>
                  <span><i className="bi bi-list-check me-1" />{f.open_tasks} задач</span>
                </div>
              </div>
            </button>
          ))}
          {list.loading && !list.data && <Loading />}
        </div>
        <div className="col-lg-7">
          {selected && <ObjectDetail key={selected} id={selected} onEdit={setEditing} onDeleted={() => { navigate('/admin/objects'); list.reload(); }} />}
        </div>
      </div>
      {editing && <ObjectForm initial={editing} onClose={() => setEditing(null)} onSaved={(f) => { setEditing(null); list.reload(); navigate(`/admin/objects/${f.id}`); }} />}
    </div>
  );
}
