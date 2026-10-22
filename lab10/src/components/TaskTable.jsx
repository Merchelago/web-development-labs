import Icon from './Icon.jsx';
import TaskRow from './TaskRow.jsx';

/** Таблица задач со списочным рендерингом и сообщением для пустого результата. */
export default function TaskTable({ tasks, users, now, onToggle, onToggleAll, onEdit, onDelete, emptyText }) {
    const allDone = tasks.length > 0 && tasks.every(t => t.status === 'done');
    return (
        <div className="table-wrap">
            <table className="tasks-table">
                <thead>
                    <tr>
                        <th>
                            <input type="checkbox" checked={allDone} disabled={!tasks.length}
                                aria-label="Отметить все показанные задачи" onChange={() => onToggleAll(!allDone)} />
                        </th>
                        <th>Задача</th>
                        <th>Метки</th>
                        <th>Дата и время</th>
                        <th>Исполнитель</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(task => (
                        <TaskRow key={task.id} task={task} user={users[task.assignee]} now={now}
                            onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </tbody>
            </table>
            {tasks.length === 0 && (
                <div className="empty">
                    <Icon name="clipboard" size={40} strokeWidth={1.4} />
                    <p>{emptyText}</p>
                </div>
            )}
        </div>
    );
}
