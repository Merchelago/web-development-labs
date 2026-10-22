import Icon from './Icon.jsx';

/** Поиск по названию (на сервере — ILIKE по title и description) и фильтр по категории. */
export default function SearchBar({ search, onSearchChange, categoryId, onCategoryChange, categories }) {
    return (
        <div className="searchbar" role="search">
            <label className="searchbar__field">
                <Icon name="search" />
                <input type="search" value={search} placeholder="Поиск задач по названию и описанию..."
                    aria-label="Поиск задач" onChange={e => onSearchChange(e.target.value)} />
            </label>
            <label className="searchbar__select">
                <Icon name="tag" />
                <select value={categoryId} aria-label="Фильтр по категории" onChange={e => onCategoryChange(e.target.value)}>
                    <option value="">Все категории</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Icon name="chevronDown" size={16} className="searchbar__chevron" />
            </label>
        </div>
    );
}
