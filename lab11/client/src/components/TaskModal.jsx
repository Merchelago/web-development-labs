import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { PRIORITIES, toInputDate, toInputTime } from '../utils.js';

function initialForm(task, defaultDate) {
    const due = task?.due_date ? new Date(task.due_date) : defaultDate;
    return {
        title: task?.title ?? '',
        description: task?.description ?? '',
        category_id: task?.category_id ?? '',
        priority: task?.priority ?? 'medium',
        date: due ? toInputDate(due) : '',
        time: task?.due_date ? toInputTime(due) : '18:00',
        assignee: task?.assignee ?? 'Ананьев А.',
        status: task?.status ?? 'new',
    };
}

/**
 * Форма создания/редактирования. Простая проверка выполняется в браузере,
 * а ошибки валидации сервера (400, details по полям) показываются под соответствующими полями.
 */
export default function TaskModal({ task, categories, defaultDate, onSubmit, onClose }) {
    const [form, setForm] = useState(() => initialForm(task, defaultDate));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState(null);
    const titleRef = useRef(null);

    useEffect(() => { titleRef.current?.focus(); }, []);
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const update = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: undefined }));
    };

    const submit = async e => {
        e.preventDefault();
        if (form.title.trim().length < 3) {
            setErrors({ title: 'Название — не короче 3 символов' });
            return;
        }
        const payload = {
            title: form.title,
            description: form.description,
            category_id: form.category_id === '' ? null : Number(form.category_id),
            priority: form.priority,
            due_date: form.date ? new Date(`${form.date}T${form.time || '18:00'}`).toISOString() : null,
            assignee: form.assignee,
            status: form.status,
        };
        setSaving(true);
        setServerError(null);
        try {
            await onSubmit(payload);
        } catch (err) {
            setErrors(err.details ?? {});
            setServerError(err.message);
            setSaving(false);
        }
    };

    const fieldError = name => errors[name] && <em>{errors[name]}</em>;

    return (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <form className="modal card" role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={submit} noValidate>
                <header className="modal__head">
                    <h2 id="modal-title">{task ? `Задача №${task.id}` : 'Новая задача'}</h2>
                    <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose}><Icon name="close" /></button>
                </header>
                {serverError && <div className="banner banner--error" role="alert">Сервер: {serverError}</div>}
                <label className={`field${errors.title ? ' has-error' : ''}`}>
                    <span>Название *</span>
                    <input ref={titleRef} value={form.title} onChange={e => update('title', e.target.value)} />
                    {fieldError('title')}
                </label>
                <label className="field">
                    <span>Описание</span>
                    <textarea rows={2} value={form.description} onChange={e => update('description', e.target.value)} />
                </label>
                <div className="field-row">
                    <label className={`field${errors.category_id ? ' has-error' : ''}`}>
                        <span>Категория</span>
                        <select value={form.category_id} onChange={e => update('category_id', e.target.value)}>
                            <option value="">Без категории</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {fieldError('category_id')}
                    </label>
                    <label className={`field${errors.priority ? ' has-error' : ''}`}>
                        <span>Приоритет</span>
                        <select value={form.priority} onChange={e => update('priority', e.target.value)}>
                            {Object.entries(PRIORITIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                        {fieldError('priority')}
                    </label>
                    <label className="field">
                        <span>Статус</span>
                        <select value={form.status} onChange={e => update('status', e.target.value)}>
                            <option value="new">Новая</option>
                            <option value="in_progress">В работе</option>
                            <option value="done">Выполнена</option>
                        </select>
                    </label>
                </div>
                <div className="field-row">
                    <label className={`field${errors.due_date ? ' has-error' : ''}`}>
                        <span>Срок (дата)</span>
                        <input type="date" value={form.date} onChange={e => update('date', e.target.value)} />
                        {fieldError('due_date')}
                    </label>
                    <label className="field">
                        <span>Время</span>
                        <input type="time" value={form.time} onChange={e => update('time', e.target.value)} />
                    </label>
                    <label className={`field${errors.assignee ? ' has-error' : ''}`}>
                        <span>Исполнитель</span>
                        <input value={form.assignee} onChange={e => update('assignee', e.target.value)} />
                        {fieldError('assignee')}
                    </label>
                </div>
                <footer className="modal__foot">
                    <button type="button" className="btn btn--ghost" onClick={onClose}>Отмена</button>
                    <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Сохранение…' : task ? 'Сохранить' : 'Создать'}</button>
                </footer>
            </form>
        </div>
    );
}
