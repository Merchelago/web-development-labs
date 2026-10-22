import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, downloadCsv } from '../api';
import CameraView from '../components/CameraView';
import { ComplianceLine, DistributionDonut, ProgressList } from '../components/charts';
import { ErrorAlert, Loading, Modal, useApi, useToast } from '../components/ui';
import { SEVERITY, timeAgo } from '../utils';
import { usePeriod } from './AdminLayout';

const PERIOD_CAPTION = { today: 'сегодня', '7d': 'за 7 дней', '30d': 'за 30 дней', '90d': 'за 90 дней' };

function Kpi({ icon, tone, value, label, change, suffix = '', inverse = false, note }) {
  const good = change === null || change === undefined ? null : inverse ? change <= 0 : change >= 0;
  return (
    <div className="card kpi-card h-100">
      <div className="card-body d-flex align-items-center gap-3">
        <span className={`kpi-icon tone-${tone}`}><i className={`bi ${icon}`} /></span>
        <div>
          <div className="kpi-value">{value ?? '—'}{suffix}</div>
          <div className="kpi-label">{label}</div>
          {note ? <div className="kpi-change text-success"><i className="bi bi-circle me-1" style={{ fontSize: '.6rem' }} />{note}</div>
            : change !== null && change !== undefined && (
              <div className={`kpi-change ${good ? 'text-success' : 'text-danger'}`}>
                <i className={`bi ${change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}`} /> {change > 0 ? '+' : ''}{change}{typeof change === 'number' && suffix === '%' ? ' п.п.' : '%'}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { period } = usePeriod();
  const navigate = useNavigate();
  const toast = useToast();
  const dash = useApi(() => api.get(`/dashboard?period=${period}`), [period]);
  const stats = useApi(() => api.get(`/statistics?period=${period === 'today' ? '7d' : period}`), [period]);
  const cams = useApi(() => api.get('/cameras'), []);
  const [camId, setCamId] = useState(1);
  const [camera, setCamera] = useState(null);
  const [camSettings, setCamSettings] = useState(false);

  useEffect(() => { api.get(`/cameras/${camId}`).then(setCamera).catch(() => setCamera(null)); }, [camId]);
  // периодическое обновление ленты событий и показателей вместо потокового обмена
  useEffect(() => {
    const t = setInterval(() => { dash.reload(); }, 20000);
    return () => clearInterval(t);
  }, [dash.reload]);

  const exportReport = async () => {
    try { toast(`Отчёт сохранён: ${await downloadCsv(`/reports/export?kind=summary&period=${period === 'today' ? '7d' : period}`)}`); } catch (e) { toast(e.message, 'error'); }
  };

  if (dash.error) return <ErrorAlert error={dash.error} onRetry={dash.reload} />;
  if (!dash.data) return <Loading />;
  const { kpi, recent, distribution } = dash.data;
  const caption = PERIOD_CAPTION[period];

  return (
    <div className="dashboard">
      <div className="row g-3 mb-3">
        <div className="col-xl col-md-6"><Kpi icon="bi-people" tone="blue" value={kpi.employees.value} label="Всего сотрудников" change={kpi.employees.change} /></div>
        <div className="col-xl col-md-6"><Kpi icon="bi-shield-check" tone="green" value={kpi.ppeCompliance.value} suffix="%" label={`Соблюдение СИЗ ${caption}`} change={kpi.ppeCompliance.change} /></div>
        <div className="col-xl col-md-6"><Kpi icon="bi-exclamation-triangle" tone="red" value={kpi.violations.value} label={`Нарушений ${caption}`} change={kpi.violations.change} inverse /></div>
        <div className="col-xl col-md-6"><Kpi icon="bi-camera-video" tone="indigo" value={kpi.cameras.value} label="Активных камер" note={`Онлайн (из ${kpi.cameras.total})`} /></div>
        <div className="col-xl-auto col-md-12 d-flex">
          <button type="button" className="btn btn-primary btn-report w-100" onClick={exportReport}><i className="bi bi-download me-2" />Скачать отчёт</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-xxl-5 col-lg-7">
          {camera && cams.data ? (
            <CameraView fill camera={camera} cameras={cams.data} onSwitch={setCamId} onSettings={() => setCamSettings(true)}
              onSelectDetection={(d) => navigate(`/admin/incidents/${d.violation_id}`)} />
          ) : <div className="card h-100"><Loading /></div>}
        </div>
        <div className="col-xxl-4 col-lg-5">
          <div className="card h-100">
            <div className="card-header-flex"><h6>Нарушения в реальном времени</h6><Link to="/admin/incidents" className="small">Все события <i className="bi bi-chevron-right" /></Link></div>
            <div className="list-group list-group-flush live-feed">
              {recent.map((v) => (
                <Link key={v.id} to={`/admin/incidents/${v.id}`} className="list-group-item list-group-item-action d-flex gap-3 align-items-center">
                  {v.image ? <img src={v.image} alt="" className="feed-thumb" /> : <span className="feed-thumb placeholder-thumb"><i className="bi bi-image" /></span>}
                  <i className={`bi ${SEVERITY[v.severity].icon} fs-4 text-${v.severity === 'medium' ? 'warning' : 'danger'}`} />
                  <span className="flex-grow-1 min-w-0">
                    <span className="d-block fw-semibold small text-truncate">{v.type_name}</span>
                    <span className="d-block small text-secondary text-truncate">{v.facility_name}{v.camera_name ? `, ${v.camera_name}` : ''}</span>
                  </span>
                  <span className="small text-secondary text-nowrap">{timeAgo(v.detected_at)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="col-xxl-3 col-lg-12">
          <div className="card h-100">
            <div className="card-header-flex"><h6>Распределение нарушений</h6><span className="small text-secondary">{caption}</span></div>
            <div className="card-body pt-0">
              <DistributionDonut items={distribution.items.filter((i) => i.count > 0 || i.code !== 'other')} total={distribution.total}
                caption={period === 'today' ? 'нарушений сегодня' : 'нарушений'} />
              <ul className="legend-list mt-3">
                {distribution.items.filter((i) => i.code !== 'other' || i.count > 0).map((i) => (
                  <li key={i.code}><span className="dot" style={{ background: i.color }} />{i.name}<span className="ms-auto fw-semibold">{i.percent}%</span>
                    <span className="legend-count" style={{ color: i.color }}>{i.count}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-xxl-5 col-lg-12">
          <div className="card h-100">
            <div className="card-header-flex"><h6>Динамика соблюдения правил (последние {stats.data?.period.days ?? 7} дней)</h6></div>
            <div className="card-body pt-0">{stats.data ? <ComplianceLine series={stats.data.series} /> : <Loading />}</div>
          </div>
        </div>
        <div className="col-xxl-4 col-lg-6">
          <div className="card h-100">
            <div className="card-header-flex"><h6>Нарушения по зонам</h6><span className="small text-secondary">{stats.data?.period.days} дн.</span></div>
            <div className="card-body pt-0">{stats.data && <ProgressList items={stats.data.byFacility} valueKey="percent" suffix="%" colors={['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6']} />}</div>
          </div>
        </div>
        <div className="col-xxl-3 col-lg-6">
          <div className="card h-100">
            <div className="card-header-flex"><h6>Типы нарушений</h6></div>
            <div className="card-body pt-0">{stats.data && <ProgressList items={stats.data.byType.filter((t) => t.code !== 'other')} />}</div>
          </div>
        </div>
      </div>

      {camSettings && camera && (
        <Modal title={`Настройки: ${camera.name}`} onClose={() => setCamSettings(false)}
          footer={<Link to="/admin/camera-control" className="btn btn-outline-primary">Управление камерами</Link>}>
          <dl className="row small mb-0">
            <dt className="col-5">Объект</dt><dd className="col-7">{camera.facility_name}</dd>
            <dt className="col-5">Расположение</dt><dd className="col-7">{camera.location}</dd>
            <dt className="col-5">Разрешение</dt><dd className="col-7">{camera.resolution}</dd>
            <dt className="col-5">Статус</dt><dd className="col-7">{camera.status === 'online' ? 'Онлайн' : 'Не в сети'}</dd>
            <dt className="col-5">Отметок нарушений на кадре</dt><dd className="col-7">{camera.violation_marks}</dd>
            <dt className="col-5">Нарушений сегодня</dt><dd className="col-7">{camera.violations_today}</dd>
          </dl>
        </Modal>
      )}
    </div>
  );
}

