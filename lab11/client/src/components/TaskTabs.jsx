/** Вкладки категорий задач с динамическими счётчиками. */
export default function TaskTabs({ tabs, active, counts, onChange }) {
    return (
        <div className="tabs" role="tablist" aria-label="Категории задач">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.id}
                    className={`tabs__item${active === tab.id ? ' is-active' : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                    <span className="tabs__count">{counts[tab.id] ?? 0}</span>
                </button>
            ))}
        </div>
    );
}
