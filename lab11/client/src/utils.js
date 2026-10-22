export const PRIORITIES = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };

export const TABS = [
    { id: 'all', label: 'Все' },
    { id: 'new', label: 'Новые' },
    { id: 'in_progress', label: 'В работе' },
    { id: 'done', label: 'Выполненные' },
    { id: 'overdue', label: 'Просроченные' },
];

// вкладка → параметры запроса к API
export const TAB_PARAMS = {
    all: {},
    new: { status: 'new' },
    in_progress: { status: 'in_progress' },
    done: { status: 'done' },
    overdue: { overdue: 'true' },
};

export const SORTS = [
    { id: 'created_at:desc', label: 'По дате создания (новые)' },
    { id: 'due_date:asc', label: 'По сроку (ближайшие)' },
    { id: 'priority:desc', label: 'По приоритету' },
    { id: 'title:asc', label: 'По названию' },
];

export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
const stripYear = s => s.replace(/\s?г\.$/, '');

export function formatDue(due, now = new Date()) {
    if (!due) return 'Без срока';
    const d = new Date(due);
    const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
    const time = timeFmt.format(d);
    if (diff === 0) return `Сегодня, ${time}`;
    if (diff === 1) return `Завтра, ${time}`;
    if (diff === -1) return `Вчера, ${time}`;
    return stripYear(dateFmt.format(d));
}

export const formatShortDate = date => stripYear(dateFmt.format(new Date(date)));

export function formatMonth(date) {
    const text = stripYear(monthFmt.format(date));
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toInputDate(date) {
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const toInputTime = date => timeFmt.format(new Date(date));

export function buildMonthGrid(monthDate) {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Отображаемый статус строки: просроченная задача выделяется отдельно */
export const displayStatus = task => (task.is_overdue ? 'overdue' : task.status);
export const STATUS_VIEW = {
    new: { label: 'Новая', cls: 'todo' },
    in_progress: { label: 'В работе', cls: 'progress' },
    done: { label: 'Выполнена', cls: 'done' },
    overdue: { label: 'Просрочена', cls: 'overdue' },
};
