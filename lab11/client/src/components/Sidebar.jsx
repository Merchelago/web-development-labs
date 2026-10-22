import Icon from './Icon.jsx';

const SECTIONS = [
    { id: 'tasks', label: 'Задачи', icon: 'tasks' },
    { id: 'categories', label: 'Категории', icon: 'tag' },
];

export default function Sidebar({ active, onSelect, overdue, online }) {
    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <span className="sidebar__logo"><Icon name="check" size={26} strokeWidth={2.4} /></span>
                <span>
                    <strong>TaskFlow</strong>
                    <small>Список задач · API</small>
                </span>
            </div>
            <nav className="sidebar__nav" aria-label="Разделы">
                {SECTIONS.map(s => (
                    <button key={s.id} type="button" className={`sidebar__item${active === s.id ? ' is-active' : ''}`}
                        aria-current={active === s.id ? 'page' : undefined} onClick={() => onSelect(s.id)}>
                        <Icon name={s.icon} />
                        <span>{s.label}</span>
                        {s.id === 'tasks' && overdue > 0 && <span className="sidebar__badge">{overdue}</span>}
                    </button>
                ))}
            </nav>
            <p className="sidebar__footer">
                <span className={`api-dot${online ? ' is-online' : ''}`} />
                {online ? 'API подключено · PostgreSQL' : 'Нет связи с API'}
            </p>
        </aside>
    );
}
