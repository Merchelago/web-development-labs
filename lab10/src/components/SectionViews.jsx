import Avatar from './Avatar.jsx';
import Calendar from './Calendar.jsx';
import StatsCards from './StatsCards.jsx';
import TagProgress from './TagProgress.jsx';
import { formatDue, formatShortDate, getStatus, isSameDay, PRIORITIES, STATUS_LABELS, TAG_COLORS } from '../utils/tasks.js';

/** Раздел «Календарь»: большой календарь и задачи выбранного дня. */
export function CalendarView({ tasks, now, selectedDate, onSelectDate }) {
    const day = selectedDate ?? now;
    const dayTasks = tasks.filter(t => isSameDay(t.due, day)).sort((a, b) => new Date(a.due) - new Date(b.due));
    return (
        <div className="section-grid">
            <Calendar large tasks={tasks} now={now} selectedDate={selectedDate} onSelectDate={onSelectDate} />
            <section className="card day-list">
                <h2>Задачи на {formatShortDate(day)}</h2>
                {dayTasks.length === 0 ? <p className="muted">На этот день задач нет — можно отдыхать.</p> : (
                    <ul>
                        {dayTasks.map(t => {
                            const status = getStatus(t, now);
                            return (
                                <li key={t.id} style={{ '--accent': TAG_COLORS[t.tags[0]] }}>
                                    <strong>{t.title}</strong>
                                    <small>{formatDue(t.due, now)} · {t.tags.join(', ')}</small>
                                    <span className={`status status--${status}`}>{STATUS_LABELS[status]}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}

/** Раздел «Статистика»: показатели, кольцевая диаграмма и нагрузка по исполнителям. */
export function StatsView({ tasks, stats, tagItems, users, now }) {
    const byUser = Object.values(users).map(u => {
        const own = tasks.filter(t => t.assignee === u.id);
        return { user: u, total: own.length, done: own.filter(t => t.status === 'done').length,
            overdue: own.filter(t => getStatus(t, now) === 'overdue').length };
    });
    const byPriority = Object.entries(PRIORITIES).map(([id, p]) => ({ id, label: p.label, count: tasks.filter(t => t.priority === id).length }));
    const max = Math.max(1, ...byPriority.map(p => p.count));
    return (
        <>
            <StatsCards stats={stats} />
            <div className="section-grid">
                <TagProgress items={tagItems} donePercent={stats.donePercent} />
                <section className="card">
                    <h2>Нагрузка по исполнителям</h2>
                    <table className="mini-table">
                        <thead><tr><th>Исполнитель</th><th>Всего</th><th>Выполнено</th><th>Просрочено</th></tr></thead>
                        <tbody>
                            {byUser.map(row => (
                                <tr key={row.user.id}>
                                    <td><Avatar user={row.user} size={26} /> {row.user.fullName}</td>
                                    <td>{row.total}</td><td>{row.done}</td><td>{row.overdue}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <h3>По приоритету</h3>
                    {byPriority.map(p => (
                        <div key={p.id} className="bar">
                            <span>{p.label}</span>
                            <i style={{ width: `${(p.count / max) * 100}%` }} className={`bar--${p.id}`} />
                            <b>{p.count}</b>
                        </div>
                    ))}
                </section>
            </div>
        </>
    );
}

/** Раздел «Метки»: карточки меток; клик открывает список задач с этим фильтром. */
export function TagsView({ tagItems, tasks, onPick }) {
    return (
        <div className="tags-grid">
            {tagItems.map(item => {
                const done = tasks.filter(t => t.tags.includes(item.tag) && t.status === 'done').length;
                return (
                    <button key={item.tag} type="button" className="card tag-card" style={{ '--chip': item.color }}
                        onClick={() => onPick(item.tag)}>
                        <span className="chip">{item.tag}</span>
                        <strong>{item.count}</strong>
                        <small>задач, выполнено {done}</small>
                        <span className="tag-card__bar"><i style={{ width: `${item.count ? (done / item.count) * 100 : 0}%` }} /></span>
                    </button>
                );
            })}
        </div>
    );
}

/** Раздел «Настройки»: имя пользователя и сброс демонстрационных данных. */
export function SettingsView({ currentUser, onRename, onReset }) {
    return (
        <section className="card settings">
            <h2>Настройки</h2>
            <label className="field">
                <span>Имя в профиле</span>
                <input value={currentUser.fullName} onChange={e => onRename(e.target.value)} />
            </label>
            <p className="muted">Задачи сохраняются в localStorage браузера и не пропадают после перезагрузки страницы.</p>
            <button type="button" className="btn btn--ghost" onClick={onReset}>Вернуть демонстрационные данные</button>
        </section>
    );
}
