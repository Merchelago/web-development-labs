import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import { displayStatus, formatDue, PRIORITIES, STATUS_VIEW } from '../utils.js';

function TaskRow({ task, now, busy, onToggle, onEdit, onDelete, onStatus }) {
    const status = displayStatus(task);
    const view = STATUS_VIEW[status];
    const accent = task.is_overdue || task.priority === 'high' ? '#e5484d' : task.category_color ?? '#94a3b8';
    return (
        <tr className={`task-row task-row--${view.cls}${busy ? ' is-busy' : ''}`}>
            <td>
                <input type="checkbox" checked={task.status === 'done'} disabled={busy}
                    aria-label={`Отметить «${task.title}» выполненной`} onChange={() => onToggle(task)} />
            </td>
            <td>
                <div className="task-row__title" style={{ '--accent': accent }}>
                    <strong>{task.title}</strong>
                    {task.description && <small>{task.description}</small>}
                </div>
            </td>
            <td>
                <div className="chips">
                    {task.category_name && <span className="chip" style={{ '--chip': task.category_color }}>{task.category_name}</span>}
                    <span className={`chip chip--prio-${task.priority}`}>{PRIORITIES[task.priority]}</span>
                </div>
            </td>
            <td className="task-row__date"><Icon name="calendar" size={18} />{formatDue(task.due_date, now)}</td>
            <td className="task-row__user">{task.assignee ? <><Avatar name={task.assignee} size={28} /><span>{task.assignee}</span></> : <span className="muted">—</span>}</td>
            <td>
                <select className={`status status--${view.cls} status-select`} value={task.status} disabled={busy}
                    aria-label={`Статус задачи «${task.title}»`} onChange={e => onStatus(task, e.target.value)}>
                    <option value="new">{task.is_overdue && task.status === 'new' ? 'Просрочена' : 'Новая'}</option>
                    <option value="in_progress">{task.is_overdue && task.status === 'in_progress' ? 'Просрочена' : 'В работе'}</option>
                    <option value="done">Выполнена</option>
                </select>
            </td>
            <td className="task-row__actions">
                <button type="button" className="icon-btn" aria-label={`Изменить «${task.title}»`} onClick={() => onEdit(task)}><Icon name="edit" size={18} /></button>
                <button type="button" className="icon-btn icon-btn--danger" aria-label={`Удалить «${task.title}»`} onClick={() => onDelete(task)}><Icon name="trash" size={18} /></button>
            </td>
        </tr>
    );
}

export default function TaskTable({ tasks, now, busyId, loading, emptyText, ...handlers }) {
    return (
        <div className={`table-wrap${loading ? ' is-loading' : ''}`}>
            <table className="tasks-table">
                <thead>
                    <tr>
                        <th aria-label="Выполнено" />
                        <th>Задача</th>
                        <th>Категория и приоритет</th>
                        <th>Срок</th>
                        <th>Исполнитель</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(task => <TaskRow key={task.id} task={task} now={now} busy={busyId === task.id} {...handlers} />)}
                </tbody>
            </table>
            {!loading && tasks.length === 0 && (
                <div className="empty"><Icon name="clipboard" size={40} strokeWidth={1.4} /><p>{emptyText}</p></div>
            )}
        </div>
    );
}
