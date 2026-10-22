import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import { formatDue, getStatus, PRIORITIES, STATUS_LABELS, TAG_COLORS } from '../utils/tasks.js';

/** Строка задачи. Все изменения (выполнено/редактировать/удалить) передаются наверх через колбэки. */
export default function TaskRow({ task, user, now, onToggle, onEdit, onDelete }) {
    const status = getStatus(task, now);
    const accent = status === 'overdue' || task.priority === 'high' ? '#e5484d' : TAG_COLORS[task.tags[0]];
    return (
        <tr className={`task-row task-row--${status}`}>
            <td>
                <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    aria-label={`Отметить «${task.title}» выполненной`}
                    onChange={() => onToggle(task.id)}
                />
            </td>
            <td>
                <div className="task-row__title" style={{ '--accent': accent }}>
                    <strong>{task.title}</strong>
                    {task.description && <small>{task.description}</small>}
                </div>
            </td>
            <td>
                <div className="chips">
                    {task.tags.map(tag => (
                        <span key={tag} className="chip" style={{ '--chip': TAG_COLORS[tag] }}>{tag}</span>
                    ))}
                    {task.priority === 'high' && <span className="chip chip--danger">{PRIORITIES.high.label}</span>}
                </div>
            </td>
            <td className="task-row__date"><Icon name="calendar" size={18} />{formatDue(task.due, now)}</td>
            <td className="task-row__user"><Avatar user={user} size={28} /><span>{user?.name}</span></td>
            <td><span className={`status status--${status}`}>{STATUS_LABELS[status]}</span></td>
            <td className="task-row__actions">
                <button type="button" className="icon-btn" aria-label={`Изменить «${task.title}»`} onClick={() => onEdit(task)}>
                    <Icon name="edit" size={18} />
                </button>
                <button type="button" className="icon-btn icon-btn--danger" aria-label={`Удалить «${task.title}»`}
                    onClick={() => onDelete(task)}>
                    <Icon name="trash" size={18} />
                </button>
            </td>
        </tr>
    );
}
