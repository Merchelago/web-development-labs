import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { buildMonthGrid, formatMonth, getStatus, isSameDay, TAG_COLORS } from '../utils/tasks.js';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/**
 * Интерактивный календарь: листание месяцев, выбор даты, отметки дней с задачами.
 * Выбранная дата хранится в App (общая для календаря и таблицы), месяц просмотра — локально.
 */
export default function Calendar({ selectedDate, onSelectDate, tasks = [], now = new Date(), large = false }) {
    const [viewDate, setViewDate] = useState(() => selectedDate ?? now);

    // Если дату выбрали извне (например, сбросили фильтр или выбрали в другом разделе),
    // календарь сам перелистывается на нужный месяц.
    useEffect(() => {
        if (selectedDate) setViewDate(selectedDate);
    }, [selectedDate]);

    const days = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

    // Для каждой даты — цвет точки: красный, если есть просроченная задача, иначе цвет метки первой задачи
    const marks = useMemo(() => {
        const map = new Map();
        for (const task of tasks) {
            const key = new Date(task.due).toDateString();
            const color = getStatus(task, now) === 'overdue' ? '#e5484d' : TAG_COLORS[task.tags[0]] ?? '#94a3b8';
            if (!map.has(key) || color === '#e5484d') map.set(key, color);
        }
        return map;
    }, [tasks, now]);

    const shiftMonth = delta => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));

    return (
        <section className={`card calendar${large ? ' calendar--large' : ''}`} aria-label="Календарь">
            <div className="calendar__head">
                <h2>Календарь</h2>
                {selectedDate && (
                    <button type="button" className="link-btn" onClick={() => onSelectDate(null)}>Сбросить</button>
                )}
            </div>
            <div className="calendar__month">
                <button type="button" className="icon-btn" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
                    <Icon name="chevronLeft" />
                </button>
                <span className="calendar__title">{formatMonth(viewDate)}</span>
                <button type="button" className="icon-btn" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>
                    <Icon name="chevronRight" />
                </button>
            </div>
            <div className="calendar__grid">
                {WEEKDAYS.map(d => <span key={d} className="calendar__weekday">{d}</span>)}
                {days.map(day => {
                    const outside = day.getMonth() !== viewDate.getMonth();
                    const selected = selectedDate && isSameDay(day, selectedDate);
                    const today = isSameDay(day, now);
                    const mark = marks.get(day.toDateString());
                    const cls = ['calendar__day', outside && 'is-outside', today && 'is-today', selected && 'is-selected']
                        .filter(Boolean).join(' ');
                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            className={cls}
                            aria-pressed={Boolean(selected)}
                            aria-label={day.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                            onClick={() => onSelectDate(selected ? null : day)}
                        >
                            {day.getDate()}
                            {mark && <i className="calendar__dot" style={{ background: mark }} />}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
