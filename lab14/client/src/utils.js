// Справочники отображения и форматирование
export const VIOLATION_STATUS = {
  new: { label: 'Новое', cls: 'danger' },
  in_progress: { label: 'В обработке', cls: 'warning' },
  resolved: { label: 'Устранено', cls: 'success' },
  closed: { label: 'Закрыто', cls: 'secondary' },
};
export const TASK_STATUS = {
  new: { label: 'Новая', cls: 'primary' },
  in_progress: { label: 'В работе', cls: 'warning' },
  done: { label: 'Выполнена', cls: 'success' },
};
export const SEVERITY = {
  low: { label: 'Низкий', cls: 'secondary', icon: 'bi-info-circle-fill' },
  medium: { label: 'Средний', cls: 'warning', icon: 'bi-exclamation-triangle-fill' },
  high: { label: 'Высокий', cls: 'danger', icon: 'bi-exclamation-circle-fill' },
  critical: { label: 'Критический', cls: 'danger', icon: 'bi-x-octagon-fill' },
};
export const PRIORITY = {
  low: { label: 'Низкий', cls: 'secondary' },
  medium: { label: 'Средний', cls: 'warning' },
  high: { label: 'Высокий', cls: 'danger' },
};
export const FACILITY_TYPE = { workshop: 'Цех', warehouse: 'Склад', territory: 'Территория', other: 'Другое' };
export const PERIODS = [
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: 'Последние 7 дней' },
  { value: '30d', label: 'Последние 30 дней' },
  { value: '90d', label: 'Последние 90 дней' },
];

const pad = (n) => String(n).padStart(2, '0');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '');
export const fmtDate = (d) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('ru-RU') : '—');
export const fmtDateTime = (d) => (d ? `${fmtDate(d)} ${fmtTime(d)}` : '—');
export const fmtDayShort = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
export const fmtDuration = (sec) => `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
export const fmtSize = (kb) => (kb >= 1024 ? `${(kb / 1024).toFixed(1).replace('.', ',')} МБ` : `${kb} КБ`);
export const todayLong = () => new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 60000;
  if (diff < 1) return 'только что';
  if (diff < 60) return `${Math.round(diff)} мин назад`;
  const today = new Date().toDateString() === new Date(d).toDateString();
  if (today) return fmtTime(d);
  const y = new Date(Date.now() - 86400000).toDateString() === new Date(d).toDateString();
  return y ? 'Вчера' : fmtDate(d);
}

export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (n) => isoDate(new Date(Date.now() + n * 86400000));

// Короткое ФИО: «Петров И. И.»
export const shortName = (full) => {
  if (!full) return '';
  const [s, n, p] = full.split(' ');
  return `${s} ${n ? `${n[0]}.` : ''}${p ? ` ${p[0]}.` : ''}`;
};

export const NOTIF_ICON = {
  violation: { icon: 'bi-exclamation-circle-fill', color: '#ef4444' },
  task: { icon: 'bi-clipboard-check-fill', color: '#16a34a' },
  status: { icon: 'bi-arrow-repeat', color: '#2563eb' },
  instruction: { icon: 'bi-journal-text', color: '#4f46e5' },
  inspection: { icon: 'bi-calendar-check-fill', color: '#f59e0b' },
};
