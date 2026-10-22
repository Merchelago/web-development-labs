// Отчёт о состоянии промышленной безопасности за период + выгрузка в CSV
import { useState } from 'react';
import { api, downloadCsv, qs } from '../api';
import { ComplianceLine } from '../components/charts';
import { ErrorAlert, Loading, useApi, useToast } from '../components/ui';
import { addDays, fmtDate, fmtDateTime } from '../utils';

export function useExport() {
  const toast = useToast();
  return async (kind, params) => {
    try { toast(`Файл сохранён: ${await downloadCsv(`/reports/export${qs({ kind, ...params })}`)}`); } catch (e) { toast(e.message, 'error'); }
  };
}

export default function Reports() {
  const [range, setRange] = useState({ from: addDays(-29), to: addDays(0) });
  const r = useApi(() => api.get(`/reports/summary${qs(range)}`), [range.from, range.to]);
  const exp = useExport();
  const d = r.data;
  const max = d ? Math.max(1, ...d.byFacility.map((f) => f.count)) : 1;
  return (
    <div>
      <div className="page-head">
        <h4>Отчёт по промышленной безопасности</h4>
        <div className="d-flex gap-1 align-items-center">
          <input type="date" className="form-control form-control-sm" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="С" />
          <span>—</span>
          <input type="date" className="form-control form-control-sm" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="По" />
        </div>
        <div className="ms-auto d-flex gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => exp('summary', range)}><i className="bi bi-filetype-csv me-1" />Отчёт CSV</button>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => exp('violations', range)}>Нарушения CSV</button>
        </div>
      </div>
      <ErrorAlert error={r.error} onRetry={r.reload} />
      {!d ? <Loading /> : (
        <div className="row g-3">
          <div className="col-12">
            <div className="report-totals card"><div className="card-body d-flex flex-wrap gap-4">
              {[['Нарушений', d.totals.violations], ['Устранено / закрыто', d.totals.resolved], ['Высокой опасности', d.totals.severe],
                ['Соблюдение СИЗ', `${d.totals.compliance ?? '—'}%`], ['Проверок СИЗ', d.totals.checks], ['Выполнено мероприятий', d.totals.tasks_done]].map(([l, v]) => (
                <div key={l}><div className="fs-4 fw-bold">{v}</div><div className="small text-secondary">{l}</div></div>
              ))}
            </div></div>
          </div>
          <div className="col-lg-5"><div className="card h-100"><div className="card-header-flex"><h6>По категориям нарушений</h6></div>
            <table className="table table-sm mb-0"><tbody>
              {d.byType.map((t) => <tr key={t.name}><td><span className="dot me-2" style={{ background: t.color }} />{t.name}</td><td className="text-end fw-semibold">{t.count}</td>
                <td className="text-end text-secondary small">{d.totals.violations ? Math.round((t.count / d.totals.violations) * 100) : 0}%</td></tr>)}
            </tbody></table></div></div>
          <div className="col-lg-7"><div className="card h-100"><div className="card-header-flex"><h6>По объектам</h6></div>
            <table className="table table-sm mb-0"><thead><tr><th>Объект</th><th>Нарушений</th><th>Устранено</th><th style={{ width: '40%' }} /></tr></thead><tbody>
              {d.byFacility.map((f) => <tr key={f.name}><td>{f.name}</td><td className="fw-semibold">{f.count}</td><td>{f.resolved}</td>
                <td><div className="progress" style={{ height: 8 }}><div className="progress-bar" style={{ width: `${(f.count / max) * 100}%` }} /></div></td></tr>)}
            </tbody></table></div></div>
          <div className="col-12"><div className="card"><div className="card-header-flex"><h6>Динамика соблюдения требований безопасности</h6></div>
            <div className="card-body pt-0"><ComplianceLine series={d.daily.map((x) => ({ ...x, danger_zone: null }))} height={240} /></div></div></div>
          <div className="col-12"><div className="card"><div className="card-header-flex"><h6>Выполненные мероприятия ({d.completedTasks.length})</h6>
            <button type="button" className="btn btn-sm btn-light" onClick={() => exp('tasks')}>Задачи CSV</button></div>
            <table className="table table-sm mb-0"><thead><tr><th>Мероприятие</th><th>Исполнитель</th><th>Выполнено</th><th>Результат</th></tr></thead><tbody>
              {d.completedTasks.map((t) => <tr key={t.title + t.completed_at}><td>{t.title}</td><td>{t.assignee}</td><td className="text-nowrap">{fmtDateTime(t.completed_at)}</td><td className="small">{t.result}</td></tr>)}
              {!d.completedTasks.length && <tr><td colSpan={4} className="text-secondary small">За период мероприятий не выполнялось</td></tr>}
            </tbody></table></div></div>
          <div className="col-12 small text-secondary">Период отчёта: {fmtDate(range.from)} — {fmtDate(range.to)}</div>
        </div>
      )}
    </div>
  );
}
