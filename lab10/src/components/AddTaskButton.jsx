import Icon from './Icon.jsx';

/** Кнопка, открывающая модальное окно создания задачи. */
export default function AddTaskButton({ onClick, disabled = false, label = 'Добавить задачу' }) {
    return (
        <button type="button" className="btn btn--primary add-task" onClick={onClick} disabled={disabled}>
            <Icon name="plus" strokeWidth={2.4} />
            <span>{label}</span>
        </button>
    );
}
