// Аналитика промышленной безопасности: выбор периода и объекта, четыре взаимосвязанных блока диаграмм
import { useState } from 'react';
import { api, qs } from '../api';
import { ComplianceLine, DistributionDonut, TypesBar, ZonesBar } from '../components/charts';
import { ErrorAlert, Loading, useApi } from '../components/ui';
import { fmtDate } from '../utils';

export default function Statistics() {
  const [period, setPeriod] = useState('7d');
  const [range, setRange] = useState({ from: '', to: '' });
  const [facility, setFacility] = useState('');
  const lookups = useApi(() => api.get('/lookups'), []);
  const custom = period === 'custom' && range.from && range.to;
  const query = custom ? { from: range.from, to: range.to, facility_id: facility } : { period: period === 'custom' ? '7d' : period, facility_id: facility };
  const s = useApi(() => api.get(`/statistics${qs(query)}`), [JSON.stringify(query)]);
  const d = s.data;
  return (
    <div>
      <div className="page-head">
        <h4>Статистика</h4>
        <div className="btn-group">
          {[['7d', '7 дней'], ['30d', '30 дней'], ['90d', '90 дней'], ['custom', 'Период…']].map(([k, l]) => (
            <button key={k} type="button" className={`btn btn-sm ${period === k ? 'btn-primary' : 'btn-light'}`} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="d-flex gap-1 align-items-center">
            <input type="date" className="form-control form-control-sm" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="С" />
            <span>—</span>
            <input type="date" className="form-control form-control-sm" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="По" />
          </div>
        )}
        <select className="form-select form-select-sm w-auto" value={facility} onChange={(e) => setFacility(e.target.value)} aria-label="Объект">
          <option value="">Все объекты</option>{lookups.data?.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <ErrorAlert error={s.error} onRetry={s.reload} />
      {!d ? <Loading /> : (
        <>
          <div className="row g-3 mb-3">
            {[['bi-exclamation-triangle', 'red', d.totals.violations, 'Нарушений за период'],
              ['bi-shield-check', 'green', `${d.totals.compliance ?? '—'}%`, 'Соблюдение СИЗ'],
              ['bi-clipboard-data', 'blue', d.totals.checks, 'Проверок СИЗ'],
              ['bi-calendar-range', 'indigo', `${fmtDate(d.period.from)} — ${fmtDate(new Date(new Date(d.period.to) - 1))}`, 'Период']].map(([icon, tone, v, l]) => (
              <div key={l} className="col-md-3"><div className="card kpi-card"><div className="card-body d-flex align-items-center gap-3">
                <span className={`kpi-icon tone-${tone}`}><i className={`bi ${icon}`} /></span><div><div className="kpi-value fs-5">{v}</div><div className="kpi-label">{l}</div></div>
              </div></div></div>
            ))}
          </div>
          <div className="row g-3">
            <div className="col-xl-8"><div className="card h-100"><div className="card-header-flex"><h6>Динамика соблюдения правил</h6></div>
              <div className="card-body pt-0"><ComplianceLine series={d.series} height={280} /></div></div></div>
            <div className="col-xl-4"><div className="card h-100"><div className="card-header-flex"><h6>Распределение нарушений</h6></div>
              <div className="card-body pt-0">
                <DistributionDonut items={d.byType} total={d.totals.violations} height={210} />
                <ul className="legend-list mt-3">{d.byType.map((t) => <li key={t.code}><span className="dot" style={{ background: t.color }} />{t.name}<span className="ms-auto fw-semibold">{t.percent}%</span><span className="legend-count" style={{ color: t.color }}>{t.count}</span></li>)}</ul>
              </div></div></div>
            <div className="col-xl-6"><div className="card h-100"><div className="card-header-flex"><h6>Нарушения по производственным зонам</h6></div>
              <div className="card-body pt-0"><ZonesBar items={d.byFacility} /></div></div></div>
            <div className="col-xl-6"><div className="card h-100"><div className="card-header-flex"><h6>Типы нарушений</h6></div>
              <div className="card-body pt-0"><TypesBar items={d.byType} /></div></div></div>
          </div>
        </>
      )}
    </div>
  );
}
