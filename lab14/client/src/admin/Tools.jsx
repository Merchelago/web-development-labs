// Инструменты: распознавание (AI), экспорт данных, настройки, уведомления администратора
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { DetectionOverlay } from '../components/CameraView';
import { Empty, ErrorAlert, Loading, useApi, useToast } from '../components/ui';
import { NOTIF_ICON, PERIODS, fmtDateTime } from '../utils';
import { useExport } from './Reports';

export function AiRecognition() {
  const cams = useApi(() => api.get('/cameras'), []);
  const [camId, setCamId] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const run = async () => {
    setBusy(true); setError(null); setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 700));     // имитация времени обработки кадра
      setResult(await api.post(`/ai/analyze/${camId}`));
    } catch (e) { setError(e); } finally { setBusy(false); }
  };
  const ready = cams.data?.filter((c) => c.status === 'online' && c.violation_marks > 0);
  return (
    <div>
      <div className="page-head"><h4>Распознавание СИЗ (AI)</h4></div>
      <div className="alert alert-info small"><i className="bi bi-info-circle me-2" />
        Учебная реализация: результаты распознавания для подготовленных кадров хранятся в базе данных (таблица detections) и отображаются как результат работы модели.</div>
      <div className="card mb-3"><div className="card-body d-flex gap-2">
        <select className="form-select" value={camId} onChange={(e) => setCamId(e.target.value)} aria-label="Камера">
          <option value="">Выберите камеру…</option>{ready?.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.facility_name}, {c.location}</option>)}
        </select>
        <button type="button" className="btn btn-primary text-nowrap" disabled={!camId || busy} onClick={run}>
          {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-cpu me-2" />}Запустить анализ</button>
      </div></div>
      <ErrorAlert error={error} />
      {result && (
        <div className="row g-3">
          <div className="col-xl-7"><div className="camera-frame rounded overflow-hidden shadow-sm">
            <img src={result.camera.frame} alt="" /><DetectionOverlay detections={result.detections} onSelect={(d) => navigate(`/admin/incidents/${d.violation_id}`)} />
          </div></div>
          <div className="col-xl-5"><div className="card"><div className="card-body">
            <h6>{result.camera.name}: результат анализа</h6>
            <div className="small text-secondary mb-3">Модель: {result.model} · обработка {result.processedMs} мс</div>
            <div className="d-flex gap-3 mb-3">
              <div><div className="fs-4 fw-bold">{result.summary.objects}</div><div className="small text-secondary">объектов</div></div>
              <div><div className="fs-4 fw-bold text-success">{result.summary.compliant}</div><div className="small text-secondary">СИЗ в норме</div></div>
              <div><div className="fs-4 fw-bold text-danger">{result.summary.violations}</div><div className="small text-secondary">нарушений</div></div>
            </div>
            <table className="table table-sm"><thead><tr><th>Класс</th><th>Уверенность</th><th>Нарушение</th></tr></thead><tbody>
              {result.detections.map((d, i) => (
                <tr key={i}><td className={d.is_violation ? 'text-danger fw-semibold' : 'text-success'}>{d.label}</td><td>{Math.round(d.confidence * 100)}%</td>
                  <td>{d.violation_id ? <button type="button" className="btn btn-link btn-sm p-0" onClick={() => navigate(`/admin/incidents/${d.violation_id}`)}>#{d.violation_id}</button> : '—'}</td></tr>
              ))}
            </tbody></table>
          </div></div></div>
        </div>
      )}
    </div>
  );
}

export function ExportData() {
  const exp = useExport();
  const [period, setPeriod] = useState('30d');
  const items = [
    ['summary', 'bi-file-earmark-bar-graph', 'Сводный отчёт', 'Показатели, категории, объекты, динамика по дням', true],
    ['violations', 'bi-exclamation-octagon', 'Журнал нарушений', 'Все нарушения за период с типом, объектом, статусом', true],
    ['tasks', 'bi-list-check', 'Задачи', 'Все задачи с исполнителями, сроками и результатами', false],
    ['employees', 'bi-people', 'Сотрудники', 'Справочник сотрудников предприятия', false],
  ];
  return (
    <div>
      <div className="page-head"><h4>Экспорт данных</h4>
        <select className="form-select form-select-sm w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Период">
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select></div>
      <div className="row g-3">
        {items.map(([kind, icon, title, descr, usesPeriod]) => (
          <div key={kind} className="col-md-6 col-xl-3"><div className="card h-100"><div className="card-body d-flex flex-column">
            <i className={`bi ${icon} fs-2 text-primary mb-2`} /><h6>{title}</h6><p className="small text-secondary flex-grow-1">{descr}</p>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => exp(kind, usesPeriod ? { period } : {})}><i className="bi bi-download me-1" />Скачать CSV</button>
          </div></div></div>
        ))}
      </div>
      <p className="small text-secondary mt-3">Файлы CSV формируются на сервере в кодировке UTF-8 с разделителем «;» и открываются в Excel.</p>
    </div>
  );
}

export function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const health = useApi(() => api.get('/health'), []);
  const [prefs, setPrefs] = useState(() => JSON.parse(localStorage.getItem('sv_prefs') || '{"refresh":20,"sound":false}'));
  const save = () => { localStorage.setItem('sv_prefs', JSON.stringify(prefs)); toast('Настройки сохранены'); };
  return (
    <div>
      <div className="page-head"><h4>Настройки</h4></div>
      <div className="row g-3">
        <div className="col-lg-6"><div className="card h-100"><div className="card-body">
          <h6>Профиль</h6>
          <dl className="row small mb-0">
            <dt className="col-5">ФИО</dt><dd className="col-7">{user.full_name}</dd>
            <dt className="col-5">Должность</dt><dd className="col-7">{user.position}</dd>
            <dt className="col-5">Email</dt><dd className="col-7">{user.email}</dd>
            <dt className="col-5">Роль</dt><dd className="col-7">Администратор</dd>
          </dl>
        </div></div></div>
        <div className="col-lg-6"><div className="card h-100"><div className="card-body">
          <h6>Интерфейс</h6>
          <label className="form-label small" htmlFor="refresh">Интервал обновления ленты событий, с</label>
          <input id="refresh" type="number" min={5} max={300} className="form-control mb-3" value={prefs.refresh} onChange={(e) => setPrefs({ ...prefs, refresh: Number(e.target.value) })} />
          <div className="form-check form-switch mb-3">
            <input id="sound" className="form-check-input" type="checkbox" checked={prefs.sound} onChange={(e) => setPrefs({ ...prefs, sound: e.target.checked })} />
            <label className="form-check-label small" htmlFor="sound">Звуковой сигнал при новом нарушении</label>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={save}>Сохранить</button>
        </div></div></div>
        <div className="col-12"><div className="card"><div className="card-body small">
          <h6>О системе</h6>
          SafeVision 1.0 · React + Bootstrap · Node.js/Express · PostgreSQL. Состояние API:{' '}
          {health.data ? <span className="text-success fw-semibold">работает, БД доступна</span> : health.error ? <span className="text-danger">{health.error.message}</span> : '…'}
        </div></div></div>
      </div>
    </div>
  );
}

export function AdminNotifications() {
  const [cat, setCat] = useState('');
  const n = useApi(() => api.get(`/notifications${cat ? `?category=${cat}` : ''}`), [cat]);
  const navigate = useNavigate();
  const open = async (x) => {
    if (!x.is_read) await api.patch(`/notifications/${x.id}/read`);
    window.dispatchEvent(new Event('sv:notifications'));
    if (x.link?.startsWith('/admin')) navigate(x.link); else n.reload();
  };
  return (
    <div>
      <div className="page-head"><h4>Уведомления</h4>
        <div className="btn-group">{[['', 'Все'], ['important', 'Важные'], ['system', 'Системные']].map(([k, l]) => (
          <button key={k} type="button" className={`btn btn-sm ${cat === k ? 'btn-primary' : 'btn-light'}`} onClick={() => setCat(k)}>{l}</button>))}</div>
        <button type="button" className="btn btn-sm btn-light ms-auto" onClick={() => api.patch('/notifications/read-all').then(() => { n.reload(); window.dispatchEvent(new Event('sv:notifications')); })}>Прочитать все</button>
      </div>
      <ErrorAlert error={n.error} />
      <div className="card">
        {!n.data ? <Loading /> : n.data.items.length ? n.data.items.map((x) => (
          <button key={x.id} type="button" className={`notif-item ${x.is_read ? '' : 'unread'}`} onClick={() => open(x)}>
            <i className={`bi ${NOTIF_ICON[x.type]?.icon}`} style={{ color: NOTIF_ICON[x.type]?.color }} />
            <span className="flex-grow-1 text-start"><span className="d-block fw-semibold small">{x.title}</span><span className="d-block small text-secondary">{x.message}</span></span>
            <span className="small text-secondary text-nowrap">{fmtDateTime(x.created_at)}</span>
          </button>
        )) : <Empty text="Уведомлений нет" />}
      </div>
    </div>
  );
}
