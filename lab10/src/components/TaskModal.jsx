import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { PRIORITIES, TAGS, toInputDate, toInputTime } from '../utils/tasks.js';

function initialForm(task, defaultDate) {
    const due = task ? new Date(task.due) : defaultDate;
    return {
        title: task?.title ?? '',
        description: task?.description ?? '',
        tags: task?.tags ?? ['Учеба'],
        priority: task?.priority ?? 'medium',
        date: toInputDate(due),
        time: task ? toInputTime(due) : '12:00',
        assignee: task?.assignee ?? 'u1',
        status: task?.status ?? 'todo',
    };
}

function validate(form) {
    const errors = {};
    if (form.title.trim().length < 3) errors.title = 'Название — не короче 3 символов';
    if (form.title.trim().length > 80) errors.title = 'Название — не длиннее 80 символов';
    if (!form.date) errors.date = 'Укажите дату';
    if (!form.tags.length) errors.tags = 'Выберите хотя бы одну метку';
    return errors;
}

/** Модальное окно создания и редактирования задачи (контролируемая форма с проверкой полей). */
export default function TaskModal({ task, users, defaultDate, onSave, onClose }) {
    const [form, setForm] = useState(() => initialForm(task, defaultDate));
    const [errors, setErrors] = useState({});
    const titleRef = useRef(null);

    // Фокус на первое поле — один раз при открытии окна
    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    // Закрытие по Escape; обработчик снимается при закрытии окна (функция очистки)
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const update = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: undefined }));
    };
    const toggleTag = tag => update('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);

    const submit = e => {
        e.preventDefault();
        const found = validate(form);
        if (Object.keys(found).length) {
            setErrors(found);
            return;
        }
        const due = new Date(`${form.date}T${form.time || '12:00'}`);
        onSave({
            ...(task ?? {}),
            title: form.title.trim(),
            description: form.description.trim(),
            tags: form.tags,
            priority: form.priority,
            assignee: form.assignee,
            status: form.status,
            due: due.toISOString(),
        });
    };

    return (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <form className="modal card" role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={submit} noValidate>
                <header className="modal__head">
                    <h2 id="modal-title">{task ? 'Редактирование задачи' : 'Новая задача'}</h2>
                    <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}><Icon name="close" /></button>
                </header>

                <label className={`field${errors.title ? ' has-error' : ''}`}>
                    <span>Название *</span>
                    <input ref={titleRef} value={form.title} maxLength={80} onChange={e => update('title', e.target.value)} />
                    {errors.title && <em>{errors.title}</em>}
                </label>

                <label className="field">
                    <span>Описание</span>
                    <textarea rows={2} value={form.description} onChange={e => update('description', e.target.value)} />
                </label>

                <fieldset className={`field${errors.tags ? ' has-error' : ''}`}>
                    <legend>Метки *</legend>
                    <div className="tag-picker">
                        {TAGS.map(tag => (
                            <button key={tag} type="button" aria-pressed={form.tags.includes(tag)}
                                className={`tag-picker__item${form.tags.includes(tag) ? ' is-on' : ''}`}
                                onClick={() => toggleTag(tag)}>{tag}</button>
                        ))}
                    </div>
                    {errors.tags && <em>{errors.tags}</em>}
                </fieldset>

                <div className="field-row">
                    <label className={`field${errors.date ? ' has-error' : ''}`}>
                        <span>Дата *</span>
                        <input type="date" value={form.date} onChange={e => update('date', e.target.value)} />
                        {errors.date && <em>{errors.date}</em>}
                    </label>
                    <label className="field">
                        <span>Время</span>
                        <input type="time" value={form.time} onChange={e => update('time', e.target.value)} />
                    </label>
                </div>

                <div className="field-row">
                    <label className="field">
                        <span>Приоритет</span>
                        <select value={form.priority} onChange={e => update('priority', e.target.value)}>
                            {Object.entries(PRIORITIES).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
                        </select>
                    </label>
                    <label className="field">
                        <span>Исполнитель</span>
                        <select value={form.assignee} onChange={e => update('assignee', e.target.value)}>
                            {Object.values(users).map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                    </label>
                    <label className="field">
                        <span>Статус</span>
                        <select value={form.status} onChange={e => update('status', e.target.value)}>
                            <option value="todo">Не начато</option>
                            <option value="progress">В процессе</option>
                            <option value="done">Выполнено</option>
                        </select>
                    </label>
                </div>

                <footer className="modal__foot">
                    <button type="button" className="btn btn--ghost" onClick={onClose}>Отмена</button>
                    <button type="submit" className="btn btn--primary">{task ? 'Сохранить' : 'Добавить'}</button>
                </footer>
            </form>
        </div>
    );
}
