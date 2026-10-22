// «Моя статистика»: круговой индикатор соблюдения, рабочие дни, нарушения, динамика
import { useState } from 'react';
import { api } from '../api';
import { ComplianceLine, Ring } from '../components/charts';
import { ErrorAlert, Loading, useApi } from '../components/ui';
import { MHeader } from './MobileLayout';

export default function MyStats() {
  const [period, setPeriod] = useState('30d');
  const s = useApi(() => api.get(`/statistics/me?period=${period}`), [period]);
  const d = s.data;
  return (
    <div>
      <MHeader title="Моя статистика" />
      <div className="m-body">
        <div className="m-tabs mb-3">
          {[['7d', '7 дней'], ['30d', '30 дней'], ['90d', '90 дней']].map(([k, l]) => (
            <button key={k} type="button" className={period === k ? 'active' : ''} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
        <ErrorAlert error={s.error} onRetry={s.reload} />
        {!d ? <Loading /> : (
          <>
            <div className="text-center mb-3"><Ring value={d.compliance} label="Соблюдение правил" size={170} /></div>
            <div className="row g-2 mb-3">
              <div className="col-6"><div className="m-stat"><div className="num">{d.work_days}</div><div className="cap">Рабочих дней</div></div></div>
              <div className="col-6"><div className="m-stat"><div className={`num ${d.violations ? 'text-danger' : ''}`}>{d.violations}</div><div className="cap">Нарушения</div></div></div>
              <div className="col-6"><div className="m-stat"><div className="num">{d.tasks.done}</div><div className="cap">Выполнено заданий</div></div></div>
              <div className="col-6"><div className="m-stat"><div className="num">{d.reported + d.inspections}</div><div className="cap">Сообщений и проверок</div></div></div>
            </div>
            <div className="m-card">
              <div className="fw-semibold small mb-2">Динамика соблюдения</div>
              <ComplianceLine series={d.series} showViolations={false} height={180} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
