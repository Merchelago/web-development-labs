// Диаграммы на Chart.js: динамика (линия), распределение (кольцо), по зонам (горизонтальные столбцы), по типам (столбцы)
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { fmtDayShort } from '../utils';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = '"Inter", "Segoe UI", system-ui, sans-serif';
ChartJS.defaults.color = '#64748b';

const grid = { color: '#eef2f7' };

export function ComplianceLine({ series, height = 220, showViolations = true }) {
  const vals = series.map((s) => s.compliance).filter((v) => v !== null && v !== undefined);
  const yMin = Math.min(50, Math.floor(Math.min(100, ...vals) / 10) * 10);
  const labels = series.map((s) => fmtDayShort(s.day));
  const datasets = [{
    label: 'Соблюдение СИЗ, %', data: series.map((s) => s.compliance), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.08)',
    fill: true, tension: 0.3, pointRadius: 3, yAxisID: 'y', spanGaps: true,
  }];
  if (showViolations) {
    datasets.push({ label: 'Нарушения', data: series.map((s) => s.violations), borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.3, pointRadius: 3, yAxisID: 'y1' });
    if (series.some((s) => s.danger_zone !== undefined && s.danger_zone !== null)) {
      datasets.push({ label: 'Опасные зоны', data: series.map((s) => s.danger_zone), borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.3, pointRadius: 3, yAxisID: 'y1' });
    }
  }
  return (
    <div style={{ height }}>
      <Line
        data={{ labels, datasets }}
        options={{
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, usePointStyle: true, padding: 14 } } },
          scales: {
            y: { min: yMin, max: 100, grid, ticks: { callback: (v) => `${v}%` } },
            ...(showViolations ? { y1: { position: 'right', grid: { display: false }, beginAtZero: true, ticks: { precision: 0 } } } : {}),
            x: { grid: { display: false } },
          },
        }}
      />
    </div>
  );
}

export function DistributionDonut({ items, total, caption = 'нарушений', height = 190 }) {
  const has = total > 0;
  return (
    <div className="donut-wrap" style={{ height }}>
      <Doughnut
        data={{
          labels: items.map((i) => i.name),
          datasets: [{ data: has ? items.map((i) => i.count) : [1], backgroundColor: has ? items.map((i) => i.color) : ['#e2e8f0'], borderWidth: 0 }],
        }}
        options={{ maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { enabled: has } } }}
      />
      <div className="donut-center"><div className="num">{total}</div><div className="cap">{caption}</div></div>
    </div>
  );
}

export function ZonesBar({ items, height = 220 }) {
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels: items.map((i) => i.name),
          datasets: [{ label: 'Нарушений', data: items.map((i) => i.count), backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#14b8a6'], borderRadius: 6 }],
        }}
        options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid, beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } }}
      />
    </div>
  );
}

export function TypesBar({ items, height = 220 }) {
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels: items.map((i) => i.name), datasets: [{ label: 'Случаев', data: items.map((i) => i.count), backgroundColor: items.map((i) => i.color), borderRadius: 6 }] }}
        options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid, beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } }}
      />
    </div>
  );
}

// Компактные горизонтальные шкалы, как в блоках «Нарушения по зонам» / «Типы нарушений» на концепте
export function ProgressList({ items, valueKey = 'count', suffix = '', colors }) {
  const max = Math.max(1, ...items.map((i) => i[valueKey]));
  return (
    <div className="progress-list">
      {items.map((i, idx) => (
        <div key={i.name} className="row-item">
          <span className="name">{i.name}</span>
          <div className="bar"><div style={{ width: `${(i[valueKey] / max) * 100}%`, background: i.color || colors?.[idx % colors.length] }} /></div>
          <span className="val">{i[valueKey]}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

// Кольцевой индикатор процента (личная статистика)
export function Ring({ value, size = 150, stroke = 14, color = '#22c55e', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e8edf3" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={`${(c * v) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.22} fontWeight="700" fill="#0f172a">{value === null ? '—' : `${v}%`}</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize={size * 0.075} fill="#64748b">{label}</text>
    </svg>
  );
}
