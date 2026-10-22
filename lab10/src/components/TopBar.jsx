import { useState } from 'react';
import AddTaskButton from './AddTaskButton.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import SearchBar from './SearchBar.jsx';
import { formatDue } from '../utils/tasks.js';

/** Верхняя панель: поиск и фильтр, кнопка добавления, уведомления о просроченных задачах, профиль. */
export default function TopBar({ searchProps, onAdd, alerts, now, currentUser, onOpenTask, onMenu }) {
    const [open, setOpen] = useState(false);
    return (
        <header className="topbar card">
            <button type="button" className="icon-btn topbar__menu" aria-label="Меню" onClick={onMenu}><Icon name="menu" /></button>
            <SearchBar {...searchProps} />
            <AddTaskButton onClick={onAdd} />
            <div className="notify">
                <button type="button" className="icon-btn notify__btn" aria-label={`Уведомления: ${alerts.length}`}
                    aria-expanded={open} onClick={() => setOpen(o => !o)}>
                    <Icon name="bell" size={22} />
                    {alerts.length > 0 && <span className="notify__badge">{alerts.length}</span>}
                </button>
                {open && (
                    <div className="notify__panel card">
                        <h3>Просроченные задачи</h3>
                        {alerts.length === 0 && <p className="muted">Нет просроченных задач</p>}
                        {alerts.map(task => (
                            <button key={task.id} type="button" className="notify__item"
                                onClick={() => { setOpen(false); onOpenTask(task); }}>
                                <strong>{task.title}</strong>
                                <small>срок: {formatDue(task.due, now)}</small>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="profile">
                <Avatar user={currentUser} size={40} />
                <span>
                    <strong>{currentUser.fullName}</strong>
                    <small>{currentUser.role}</small>
                </span>
            </div>
        </header>
    );
}
