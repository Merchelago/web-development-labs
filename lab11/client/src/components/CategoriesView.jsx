import { useState } from 'react';
import Icon from './Icon.jsx';

/** Управление категориями: создание, переименование, удаление (ошибки сервера, например 409, выводятся пользователю). */
export default function CategoriesView({ categories, onCreate, onUpdate, onDelete }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#0ea5e9');
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState(null);

    const run = async action => {
        setError(null);
        try {
            await action();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const create = async e => {
        e.preventDefault();
        if (await run(() => onCreate({ name, color }))) setName('');
    };

    return (
        <section className="card categories">
            <h2>Категории задач</h2>
            {error && <div className="banner banner--error" role="alert">{error}</div>}
            <form className="categories__form" onSubmit={create}>
                <input value={name} placeholder="Новая категория" aria-label="Название категории" onChange={e => setName(e.target.value)} />
                <input type="color" value={color} aria-label="Цвет категории" onChange={e => setColor(e.target.value)} />
                <button type="submit" className="btn btn--primary"><Icon name="plus" />Добавить</button>
            </form>
            <ul className="categories__list">
                {categories.map(c => (
                    <li key={c.id} style={{ '--chip': c.color }}>
                        <i className="categories__swatch" />
                        {editing?.id === c.id ? (
                            <form className="categories__edit" onSubmit={async e => {
                                e.preventDefault();
                                if (await run(() => onUpdate(c.id, { name: editing.name, color: c.color }))) setEditing(null);
                            }}>
                                <input value={editing.name} aria-label="Новое название" autoFocus onChange={e => setEditing({ ...editing, name: e.target.value })} />
                                <button type="submit" className="btn btn--primary">Сохранить</button>
                                <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Отмена</button>
                            </form>
                        ) : (
                            <>
                                <strong>{c.name}</strong>
                                <span className="muted">задач: {c.tasks_count}</span>
                                <span className="categories__actions">
                                    <button type="button" className="icon-btn" aria-label={`Переименовать «${c.name}»`} onClick={() => setEditing({ id: c.id, name: c.name })}><Icon name="edit" size={18} /></button>
                                    <button type="button" className="icon-btn icon-btn--danger" aria-label={`Удалить «${c.name}»`} onClick={() => run(() => onDelete(c))}><Icon name="trash" size={18} /></button>
                                </span>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
