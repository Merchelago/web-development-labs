// Вспомогательные функции для работы с задачами и датами (без React — их удобно тестировать отдельно)

export const TAGS = ['Учеба', 'Проект', 'Личное', 'Разработка'];

export const TAG_COLORS = {
    'Учеба': '#2f80ed',
    'Проект': '#22a861',
    'Личное': '#8b5cf6',
    'Разработка': '#f59e0b',
};

export const PRIORITIES = {
    high: { label: 'Высокий', weight: 3 },
    medium: { label: 'Средний', weight: 2 },
    low: { label: 'Низкий', weight: 1 },
};

export const STATUS_LABELS = {
    todo: 'Не начато',
    progress: 'В процессе',
    done: 'Выполнено',
    overdue: 'Просрочено',
};

export const TABS = [
    { id: 'all', label: 'Все' },
    { id: 'today', label: 'Сегодня' },
    { id: 'progress', label: 'В процессе' },
    { id: 'done', label: 'Завершенные' },
    { id: 'overdue', label: 'Просроченные' },
];

export const SORTS = [
    { id: 'date-desc', label: 'По дате (сначала новые)' },
    { id: 'date-asc', label: 'По дате (сначала старые)' },
    { id: 'priority', label: 'По приоритету' },
    { id: 'title', label: 'По названию' },
];

export function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function isSameDay(a, b) {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/** Задача из JSON хранит смещение в днях от сегодняшней даты — так демо-данные всегда «свежие». */
export function hydrateTask(raw, today = new Date()) {
    const due = startOfDay(addDays(today, raw.dayOffset ?? 0));
    const [h, m] = (raw.time || '12:00').split(':').map(Number);
    due.setHours(h, m);
    const { dayOffset, time, ...rest } = raw;
    return { ...rest, due: due.toISOString() };
}

/** Отображаемый статус: просроченной считается невыполненная задача, срок которой прошёл. */
export function getStatus(task, now = new Date()) {
    if (task.status === 'done') return 'done';
    if (new Date(task.due) < now) return 'overdue';
    return task.status;
}

export function matchesTab(task, tab, now = new Date()) {
    const status = getStatus(task, now);
    switch (tab) {
        case 'today': return isSameDay(task.due, now);
        case 'progress': return status === 'progress';
        case 'done': return status === 'done';
        case 'overdue': return status === 'overdue';
        default: return true;
    }
}

export function countByTab(tasks, now = new Date()) {
    return Object.fromEntries(TABS.map(t => [t.id, tasks.filter(task => matchesTab(task, t.id, now)).length]));
}

export function filterTasks(tasks, { search = '', tag = 'all', tab = 'all', date = null }, now = new Date()) {
    const query = search.trim().toLowerCase();
    return tasks.filter(task => {
        if (!matchesTab(task, tab, now)) return false;
        if (tag !== 'all' && !task.tags.includes(tag)) return false;
        if (date && !isSameDay(task.due, date)) return false;
        if (!query) return true;
        const haystack = [task.title, task.description, ...task.tags].join(' ').toLowerCase();
        return haystack.includes(query);
    });
}

export function sortTasks(tasks, sort) {
    const list = [...tasks];
    switch (sort) {
        case 'date-asc': return list.sort((a, b) => new Date(a.due) - new Date(b.due));
        case 'priority': return list.sort((a, b) => PRIORITIES[b.priority].weight - PRIORITIES[a.priority].weight
            || new Date(a.due) - new Date(b.due));
        case 'title': return list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        default: return list.sort((a, b) => new Date(b.due) - new Date(a.due));
    }
}

export function getStats(tasks, now = new Date()) {
    const counts = { total: tasks.length, done: 0, progress: 0, todo: 0, overdue: 0 };
    for (const task of tasks) counts[getStatus(task, now)] += 1;
    counts.donePercent = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;
    return counts;
}

export function tagStats(tasks) {
    return TAGS.map(tag => ({
        tag,
        color: TAG_COLORS[tag],
        count: tasks.filter(t => t.tags.includes(tag)).length,
    }));
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });

/** «Сегодня, 14:00», «Завтра, 10:00», «Вчера, 18:00» или «15 окт. 2026» */
export function formatDue(due, now = new Date()) {
    const d = new Date(due);
    const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
    const time = timeFmt.format(d);
    if (diff === 0) return `Сегодня, ${time}`;
    if (diff === 1) return `Завтра, ${time}`;
    if (diff === -1) return `Вчера, ${time}`;
    return dateFmt.format(d).replace(/\s?г\.$/, '');
}

export function formatMonth(date) {
    const text = monthFmt.format(date).replace(/\s?г\.$/, '');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(date) {
    return dateFmt.format(new Date(date)).replace(/\s?г\.$/, '');
}

export function toInputDate(date) {
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toInputTime(date) {
    return timeFmt.format(new Date(date));
}

/** Сетка календаря: 6 недель по 7 дней, неделя начинается с понедельника. */
export function buildMonthGrid(monthDate) {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const shift = (first.getDay() + 6) % 7; // 0 — понедельник
    const start = addDays(first, -shift);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
