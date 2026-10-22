import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { buildMonthGrid, formatMonth, isSameDay } from '../utils.js';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Календарь: выбор даты становится фильтром запроса к API (?due=YYYY-MM-DD). */
export default function Calendar({ selectedDate, onSelectDate, tasks, now }) {
    const [viewDate, setViewDate] = useState(() => selectedDate ?? now);

    useEffect(() => {
        if (selectedDate) setViewDate(selectedDate);
    }, [selectedDate]);

    const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
    const marks = useMemo(() => {
        const map = new Map();
        for (const t of tasks) {
            if (!t.due_date) continue;
            const key = new Date(t.due_date).toDateString();
            const color = t.is_overdue ? '#e5484d' : t.category_color ?? '#94a3b8';
            if (!map.has(key) || color === '#e5484d') map.set(key, color);
        }
        return map;
    }, [tasks]);

    const shift = delta => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));

    return (
        <section className="card calendar" aria-label="Календарь">
            <div className="calendar__head">
                <h2>Календарь</h2>
                {selectedDate && <button type="button" className="link-btn" onClick={() => onSelectDate(null)}>Сбросить</button>}
            </div>
            <div className="calendar__month">
                <button type="button" className="icon-btn" aria-label="Предыдущий месяц" onClick={() => shift(-1)}><Icon name="chevronLeft" /></button>
                <span className="calendar__title">{formatMonth(viewDate)}</span>
                <button type="button" className="icon-btn" aria-label="Следующий месяц" onClick={() => shift(1)}><Icon name="chevronRight" /></button>
            </div>
            <div className="calendar__grid">
                {WEEKDAYS.map(d => <span key={d} className="calendar__weekday">{d}</span>)}
                {days.map(day => {
                    const selected = selectedDate && isSameDay(day, selectedDate);
                    const cls = ['calendar__day', day.getMonth() !== viewDate.getMonth() && 'is-outside',
                        isSameDay(day, now) && 'is-today', selected && 'is-selected'].filter(Boolean).join(' ');
                    const mark = marks.get(day.toDateString());
                    return (
                        <button key={day.toISOString()} type="button" className={cls} aria-pressed={Boolean(selected)}
                            aria-label={day.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                            onClick={() => onSelectDate(selected ? null : day)}>
                            {day.getDate()}
                            {mark && <i className="calendar__dot" style={{ background: mark }} />}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
