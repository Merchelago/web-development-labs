// «Мои задания»: список назначенных задач и выполнение задачи
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorAlert, Loading, PriorityBadge, TaskBadge, useApi, useToast } from '../components/ui';
import { fmtDate, fmtDateTime } from '../utils';
import { MHeader } from './MobileLayout';

export function MyTasks() {
  const [tab, setTab] = useState('active');
  const tasks = useApi(() => api.get('/tasks?mine=1'), []);
  const items = tasks.data?.filter((t) => (tab === 'active' ? t.status !== 'done' : t.status === 'done')) || [];
  return (
    <div>
      <MHeader title="Мои задания" />
      <div className="m-body">
        <div className="m-tabs">
          <button type="button" className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Активные ({tasks.data?.filter((t) => t.status !== 'done').length ?? 0})</button>
          <button type="button" className={tab === 'done' ? 'active' : ''} onClick={() => setTab('done')}>Выполненные</button>
        </div>
        <ErrorAlert error={tasks.error} onRetry={tasks.reload} />
        {tasks.loading && !tasks.data && <Loading />}
        {items.map((t) => (
          <Link key={t.id} to={`/m/tasks/${t.id}`} className={`m-task prio-${t.priority}`}>
            <div className="d-flex align-items-start gap-2">
              <span className="fw-semibold flex-grow-1">{t.title}</span><TaskBadge status={t.status} />
            </div>
            <div className="small text-secondary mt-1">{t.facility_name || 'Без объекта'}{t.violation_type ? ` · ${t.violation_type}` : ''}</div>
            <div className="d-flex align-items-center gap-2 mt-2 small">
              <PriorityBadge priority={t.priority} />
              <span className={t.overdue ? 'text-danger fw-semibold' : 'text-secondary'}><i className="bi bi-calendar-event me-1" />до {fmtDate(t.due_date)}{t.overdue ? ' — просрочено' : ''}</span>
            </div>
          </Link>
        ))}
        {tasks.data && !items.length && <Empty icon="bi-clipboard-check" text={tab === 'active' ? 'Активных заданий нет' : 'Выполненных заданий нет'} />}
      </div>
    </div>
  );
}

export function TaskDetail() {
  const { id } = useParams();
  const toast = useToast();
  const t = useApi(() => api.get(`/tasks/${id}`), [id]);
  const [result, setResult] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');

  const update = async (body, msg) => {
    try {
      t.setData(await api.patch(`/tasks/${id}`, body));
      toast(msg);
      setFinishing(false);
    } catch (e) { setError(e.message); }
  };
  const finish = (e) => {
    e.preventDefault();
    if (!result.trim()) { setError('Опишите, что сделано'); return; }
    update({ status: 'done', result: result.trim() }, 'Задание выполнено');
  };
  const task = t.data;
  return (
    <div>
      <MHeader title="Задание" />
      <div className="m-body">
        <ErrorAlert error={t.error} />
        {!task ? <Loading /> : (
          <>
            <div className="d-flex gap-2 mb-2"><TaskBadge status={task.status} /><PriorityBadge priority={task.priority} /></div>
            <h2 className="h5">{task.title}</h2>
            <p className="small">{task.description || 'Описание не указано'}</p>
            <ul className="m-facts">
              <li><i className="bi bi-geo-alt" />Объект<span>{task.facility_name || '—'}</span></li>
              <li><i className="bi bi-calendar-event" />Срок<span className={task.overdue ? 'text-danger' : ''}>{fmtDate(task.due_date)}</span></li>
              {task.violation_id && <li><i className="bi bi-exclamation-octagon" />Нарушение<Link to={`/m/violations/${task.violation_id}`}>#{task.violation_id} {task.violation_type}</Link></li>}
              <li><i className="bi bi-clock-history" />Создано<span>{fmtDateTime(task.created_at)}</span></li>
              {task.completed_at && <li><i className="bi bi-check2-circle" />Выполнено<span>{fmtDateTime(task.completed_at)}</span></li>}
            </ul>
            {task.result && <div className="alert alert-success small"><strong>Результат:</strong> {task.result}</div>}
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            {task.status === 'new' && (
              <button type="button" className="btn btn-outline-primary w-100 mb-2" onClick={() => update({ status: 'in_progress' }, 'Задание взято в работу')}>Взять в работу</button>
            )}
            {task.status !== 'done' && !finishing && (
              <button type="button" className="btn btn-success w-100" onClick={() => setFinishing(true)}><i className="bi bi-check2-circle me-1" />Отметить выполнение</button>
            )}
            {finishing && (
              <form onSubmit={finish} noValidate>
                <label className="form-label small fw-semibold" htmlFor="res">Результат выполнения</label>
                <textarea id="res" className="form-control mb-2" rows={3} value={result} onChange={(e) => { setResult(e.target.value); setError(''); }}
                  placeholder="Что сделано" />
                <button type="submit" className="btn btn-success w-100">Подтвердить выполнение</button>
              </form>
            )}
            {task.status === 'done' && (
              <button type="button" className="btn btn-light w-100 mt-2" onClick={() => update({ status: 'in_progress' }, 'Задание возвращено в работу')}>Вернуть в работу</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
