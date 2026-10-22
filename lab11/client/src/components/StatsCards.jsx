import Icon from './Icon.jsx';

/** Карточки статистики — данные приходят с сервера (GET /api/tasks/stats). */
export default function StatsCards({ stats }) {
    const cards = [
        { key: 'total', label: 'Всего задач', value: stats.total, icon: 'list', tone: 'blue', note: `сегодня по сроку: ${stats.due_today}` },
        { key: 'done', label: 'Выполнено', value: stats.done, icon: 'check', tone: 'green', note: `${stats.done_percent}% от всех` },
        { key: 'active', label: 'Активные', value: stats.active, icon: 'clock', tone: 'orange', note: `в работе: ${stats.in_progress}, новых: ${stats.new}` },
        { key: 'overdue', label: 'Просрочено', value: stats.overdue, icon: 'alert', tone: 'red', note: stats.overdue ? 'требуют внимания' : 'всё в срок' },
    ];
    return (
        <div className="stats">
            {cards.map(c => (
                <article key={c.key} className={`card stat stat--${c.tone}`}>
                    <span className="stat__icon"><Icon name={c.icon} size={26} /></span>
                    <div>
                        <strong className="stat__value">{c.value}</strong>
                        <span className="stat__label">{c.label}</span>
                        <span className="stat__note">{c.note}</span>
                    </div>
                </article>
            ))}
        </div>
    );
}
