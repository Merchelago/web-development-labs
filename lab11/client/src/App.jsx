import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import AddTaskButton from './components/AddTaskButton.jsx';
import Avatar from './components/Avatar.jsx';
import Calendar from './components/Calendar.jsx';
import CategoriesView from './components/CategoriesView.jsx';
import CategoryProgress from './components/CategoryProgress.jsx';
import Icon from './components/Icon.jsx';
import SearchBar from './components/SearchBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import StatsCards from './components/StatsCards.jsx';
import TaskModal from './components/TaskModal.jsx';
import TaskTable from './components/TaskTable.jsx';
import TaskTabs from './components/TaskTabs.jsx';
import { formatShortDate, SORTS, TAB_PARAMS, TABS, toInputDate } from './utils.js';

const EMPTY_STATS = { total: 0, done: 0, active: 0, new: 0, in_progress: 0, overdue: 0, due_today: 0, done_percent: 0, by_category: [] };

export default function App() {
    const [section, setSection] = useState('tasks');
    const [tasks, setTasks] = useState([]);
    const [calendarTasks, setCalendarTasks] = useState([]);
    const [stats, setStats] = useState(EMPTY_STATS);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [online, setOnline] = useState(true);
    const [version, setVersion] = useState(0); // увеличивается после каждого изменения данных → перезагрузка
    // фильтры
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tab, setTab] = useState('all');
    const [sort, setSort] = useState(SORTS[0].id);
    const [selectedDate, setSelectedDate] = useState(null);
    // интерфейс
    const [modal, setModal] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [toast, setToast] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const now = useMemo(() => new Date(), [version]); // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = () => setVersion(v => v + 1);

    // поиск отправляется на сервер не на каждую букву, а через 300 мс после окончания ввода
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(id);
    }, [search]);

    // справочники и статистика — после каждого изменения данных
    useEffect(() => {
        Promise.all([api.stats(), api.categories(), api.tasks({ sort: 'due_date', order: 'asc' })])
            .then(([s, c, all]) => {
                setStats(s);
                setCategories(c);
                setCalendarTasks(all);
                setOnline(true);
            })
            .catch(err => { setOnline(false); setError(err.message); });
    }, [version]);

    // список задач — при изменении любого фильтра; устаревший запрос отменяется через AbortController
    useEffect(() => {
        const controller = new AbortController();
        const [field, order] = sort.split(':');
        setLoading(true);
        api.tasks({
            search: debouncedSearch,
            category_id: categoryId,
            due: selectedDate ? toInputDate(selectedDate) : undefined,
            sort: field,
            order,
            ...TAB_PARAMS[tab],
        }, controller.signal)
            .then(list => { setTasks(list); setError(null); setOnline(true); })
            .catch(err => {
                if (err.name === 'AbortError') return;
                setError(err.message);
                setOnline(err.status !== 0 && err.status < 500);
            })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [debouncedSearch, categoryId, tab, sort, selectedDate, version]);

    useEffect(() => {
        if (!toast) return undefined;
        const id = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(id);
    }, [toast]);

    const closeModal = useCallback(() => setModal(null), []);

    // --- действия: каждое — запрос к API, затем перезагрузка данных ---
    const mutate = async (action, message, id = null) => {
        setBusyId(id);
        try {
            await action();
            setToast(message);
            refresh();
        } catch (err) {
            setToast(`Ошибка: ${err.message}`);
            throw err;
        } finally {
            setBusyId(null);
        }
    };

    const saveTask = async payload => {
        const editing = modal.task;
        await mutate(() => (editing ? api.updateTask(editing.id, payload) : api.createTask(payload)),
            editing ? 'Задача сохранена' : 'Задача создана');
        setModal(null);
    };
    const toggle = task => mutate(() => api.setStatus(task.id, task.status === 'done' ? 'in_progress' : 'done'),
        task.status === 'done' ? 'Задача возвращена в работу' : 'Задача выполнена', task.id).catch(() => {});
    const changeStatus = (task, status) => mutate(() => api.setStatus(task.id, status), 'Статус изменён', task.id).catch(() => {});
    const remove = task => {
        if (!window.confirm(`Удалить задачу «${task.title}»?`)) return;
        mutate(() => api.deleteTask(task.id), 'Задача удалена', task.id).catch(() => {});
    };

    const counts = { all: stats.total, new: stats.new, in_progress: stats.in_progress, done: stats.done, overdue: stats.overdue };
    const hasFilters = debouncedSearch || categoryId || selectedDate;
    const categoryName = categories.find(c => String(c.id) === categoryId)?.name;

    return (
        <div className={`app${menuOpen ? ' menu-open' : ''}`}>
            <Sidebar active={section} overdue={stats.overdue} online={online} onSelect={id => { setSection(id); setMenuOpen(false); }} />
            <div className="backdrop" onClick={() => setMenuOpen(false)} />
            <main className="main">
                <header className="topbar card">
                    <button type="button" className="icon-btn topbar__menu" aria-label="Меню" onClick={() => setMenuOpen(o => !o)}><Icon name="menu" /></button>
                    <SearchBar search={search} onSearchChange={setSearch} categoryId={categoryId}
                        onCategoryChange={id => { setCategoryId(id); setSection('tasks'); }} categories={categories} />
                    <AddTaskButton onClick={() => setModal({ task: null })} disabled={!online} />
                    <div className="profile">
                        <Avatar name="Ананьев Александр" size={40} />
                        <span><strong>Ананьев Александр</strong><small>Студент</small></span>
                    </div>
                </header>

                {error && (
                    <div className="banner banner--error" role="alert">
                        <span>{error}</span>
                        <button type="button" className="btn btn--ghost" onClick={refresh}>Повторить</button>
                    </div>
                )}

                {section === 'categories' ? (
                    <CategoriesView categories={categories}
                        onCreate={data => mutate(() => api.createCategory(data), 'Категория добавлена')}
                        onUpdate={(id, data) => mutate(() => api.updateCategory(id, data), 'Категория переименована')}
                        onDelete={c => mutate(() => api.deleteCategory(c.id), 'Категория удалена')} />
                ) : (
                    <div className="dashboard">
                        <div className="dashboard__main">
                            <StatsCards stats={stats} />
                            <section className="card tasks-card">
                                <div className="tasks-card__head">
                                    <TaskTabs tabs={TABS} active={tab} counts={counts} onChange={setTab} />
                                    <label className="sort">
                                        <Icon name="sort" size={18} />
                                        <select value={sort} aria-label="Сортировка" onChange={e => setSort(e.target.value)}>
                                            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        </select>
                                    </label>
                                </div>
                                {hasFilters && (
                                    <div className="active-filters">
                                        <span>Фильтры:</span>
                                        {debouncedSearch && <button type="button" onClick={() => setSearch('')}>«{debouncedSearch}» ×</button>}
                                        {categoryId && <button type="button" onClick={() => setCategoryId('')}>категория: {categoryName} ×</button>}
                                        {selectedDate && <button type="button" onClick={() => setSelectedDate(null)}>срок: {formatShortDate(selectedDate)} ×</button>}
                                    </div>
                                )}
                                <TaskTable tasks={tasks} now={now} busyId={busyId} loading={loading}
                                    emptyText={loading ? '' : error ? 'Данные не загружены — см. сообщение об ошибке выше.' : 'Задач по заданным условиям не найдено.'}
                                    onToggle={toggle} onStatus={changeStatus} onEdit={task => setModal({ task })} onDelete={remove} />
                            </section>
                        </div>
                        <div className="dashboard__side">
                            <Calendar tasks={calendarTasks} now={now} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                            <CategoryProgress items={stats.by_category} donePercent={stats.done_percent} onPick={setCategoryId} />
                        </div>
                    </div>
                )}
            </main>
            {modal && (
                <TaskModal key={modal.task?.id ?? 'new'} task={modal.task} categories={categories}
                    defaultDate={selectedDate ?? now} onSubmit={saveTask} onClose={closeModal} />
            )}
            {toast && <div className="toast" role="status">{toast}</div>}
        </div>
    );
}
