import Icon from './Icon.jsx';

export const SECTIONS = [
    { id: 'tasks', label: 'Задачи', icon: 'tasks' },
    { id: 'calendar', label: 'Календарь', icon: 'calendar' },
    { id: 'stats', label: 'Статистика', icon: 'stats' },
    { id: 'tags', label: 'Метки', icon: 'tag' },
    { id: 'settings', label: 'Настройки', icon: 'settings' },
];

/** Боковое меню: активный раздел приходит из App, выбор раздела поднимается наверх через onSelect. */
export default function Sidebar({ active, onSelect, badges = {} }) {
    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <span className="sidebar__logo"><Icon name="check" size={26} strokeWidth={2.4} /></span>
                <span>
                    <strong>TaskFlow</strong>
                    <small>Планировщик задач</small>
                </span>
            </div>
            <nav className="sidebar__nav" aria-label="Разделы приложения">
                {SECTIONS.map(section => (
                    <button
                        key={section.id}
                        type="button"
                        className={`sidebar__item${active === section.id ? ' is-active' : ''}`}
                        aria-current={active === section.id ? 'page' : undefined}
                        onClick={() => onSelect(section.id)}
                    >
                        <Icon name={section.icon} />
                        <span>{section.label}</span>
                        {badges[section.id] > 0 && <span className="sidebar__badge">{badges[section.id]}</span>}
                    </button>
                ))}
            </nav>
            <p className="sidebar__footer">ПГТУ · Практическая работа №10</p>
        </aside>
    );
}
