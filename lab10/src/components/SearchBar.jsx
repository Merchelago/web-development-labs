import Icon from './Icon.jsx';

/** Поиск по названию/описанию/меткам и фильтр по метке. Компонент «управляемый»: значения хранит родитель. */
export default function SearchBar({ search, onSearchChange, tag, onTagChange, tags }) {
    return (
        <div className="searchbar" role="search">
            <label className="searchbar__field">
                <Icon name="search" />
                <input
                    type="search"
                    value={search}
                    placeholder="Поиск задач, меток, описания..."
                    aria-label="Поиск задач"
                    onChange={e => onSearchChange(e.target.value)}
                />
            </label>
            <label className="searchbar__select">
                <Icon name="tag" />
                <select value={tag} aria-label="Фильтр по меткам" onChange={e => onTagChange(e.target.value)}>
                    <option value="all">Все метки</option>
                    {tags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Icon name="chevronDown" size={16} className="searchbar__chevron" />
            </label>
        </div>
    );
}
