import Icon from './Icon.jsx';

/** Четыре карточки ключевых показателей. Данные считаются в App и приходят через props. */
export default function StatsCards({ stats }) {
    const share = n => (stats.total ? Math.round((n / stats.total) * 100) : 0);
    const cards = [
        { key: 'total', label: 'Всего задач', value: stats.total, icon: 'list', tone: 'blue' },
        { key: 'done', label: 'Выполнено', value: stats.done, icon: 'check', tone: 'green', note: `${share(stats.done)}% от всех` },
        { key: 'progress', label: 'В процессе', value: stats.progress, icon: 'clock', tone: 'orange', note: `${share(stats.progress)}% от всех` },
        { key: 'overdue', label: 'Просрочено', value: stats.overdue, icon: 'alert', tone: 'red', note: stats.overdue ? 'требуют внимания' : 'всё в срок' },
    ];
    return (
        <div className="stats">
            {cards.map(card => (
                <article key={card.key} className={`card stat stat--${card.tone}`}>
                    <span className="stat__icon"><Icon name={card.icon} size={26} /></span>
                    <div>
                        <strong className="stat__value">{card.value}</strong>
                        <span className="stat__label">{card.label}</span>
                        {card.note && <span className="stat__note">{card.note}</span>}
                    </div>
                </article>
            ))}
        </div>
    );
}
