import { useCallback, useEffect, useMemo, useState } from 'react';
import Calendar from './components/Calendar.jsx';
import Icon from './components/Icon.jsx';
import Sidebar from './components/Sidebar.jsx';
import StatsCards from './components/StatsCards.jsx';
import TagProgress from './components/TagProgress.jsx';
import TaskModal from './components/TaskModal.jsx';
import TaskTable from './components/TaskTable.jsx';
import TaskTabs from './components/TaskTabs.jsx';
import TopBar from './components/TopBar.jsx';
import { CalendarView, SettingsView, StatsView, TagsView } from './components/SectionViews.jsx';
import {
    countByTab, filterTasks, formatShortDate, getStats, getStatus, hydrateTask,
    SORTS, sortTasks, TABS, TAGS, tagStats,
} from './utils/tasks.js';

const STORAGE_KEY = 'taskflow.tasks.v1';
const DATA_URL = `${import.meta.env.BASE_URL}data/tasks.json`;

function readSavedTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export default function App() {
    // --- данные ---
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    // --- состояние интерфейса ---
    const [section, setSection] = useState('tasks');
    const [search, setSearch] = useState('');
    const [tag, setTag] = useState('all');
    const [tab, setTab] = useState('all');
    const [sort, setSort] = useState('date-desc');
    const [selectedDate, setSelectedDate] = useState(null);
    const [modal, setModal] = useState(null); // null | { task: объект или null для новой }
    const [now, setNow] = useState(() => new Date());
    const [userName, setUserName] = useState('Ананьев Александр');
    const [menuOpen, setMenuOpen] = useState(false);
    const [toast, setToast] = useState(null);

    // useEffect №1: загрузка исходных данных при запуске (и повторная — по кнопке «Повторить»/сбросу).
    // Если в localStorage уже есть сохранённые задачи, берём их, иначе — демонстрационный набор из JSON.
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const res = await fetch(DATA_URL);
                if (!res.ok) throw new Error(`сервер ответил ${res.status}`);
                const data = await res.json();
                await new Promise(r => setTimeout(r, 400)); // имитация сетевой задержки
                if (cancelled) return;
                setUsers(Object.fromEntries(data.users.map(u => [u.id, u])));
                setTasks(readSavedTasks() ?? data.tasks.map(t => hydrateTask(t)));
            } catch (e) {
                if (!cancelled) setError(`Не удалось загрузить задачи: ${e.message}`);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [reloadKey]);

    // useEffect №2: сохранение задач в localStorage после каждого изменения (но не во время загрузки)
    useEffect(() => {
        if (loading || error) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }, [tasks, loading, error]);

    // useEffect №3: «часы» — раз в минуту обновляем текущее время, чтобы задачи становились просроченными без перезагрузки
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    // useEffect №4: всплывающее сообщение исчезает само через 2,5 с
    useEffect(() => {
        if (!toast) return undefined;
        const id = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(id);
    }, [toast]);

    // --- производные данные ---
    const stats = useMemo(() => getStats(tasks, now), [tasks, now]);
    const tagItems = useMemo(() => tagStats(tasks), [tasks]);
    const alerts = useMemo(() => tasks.filter(t => getStatus(t, now) === 'overdue'), [tasks, now]);
    // счётчики вкладок учитывают поиск, метку и дату, но не саму вкладку
    const prefiltered = useMemo(() => filterTasks(tasks, { search, tag, date: selectedDate }, now),
        [tasks, search, tag, selectedDate, now]);
    const counts = useMemo(() => countByTab(prefiltered, now), [prefiltered, now]);
    const visible = useMemo(() => sortTasks(filterTasks(prefiltered, { tab }, now), sort),
        [prefiltered, tab, sort, now]);

    // useEffect №5: заголовок вкладки браузера отражает число активных и просроченных задач
    useEffect(() => {
        const active = stats.total - stats.done;
        document.title = stats.overdue
            ? `(${stats.overdue}) TaskFlow — есть просроченные`
            : `TaskFlow — активных задач: ${active}`;
    }, [stats]);

    // --- обработчики событий (передаются в дочерние компоненты через props) ---
    const closeModal = useCallback(() => setModal(null), []);

    const saveTask = data => {
        if (data.id) {
            setTasks(list => list.map(t => (t.id === data.id ? data : t)));
            setToast('Задача обновлена');
        } else {
            setTasks(list => [...list, { ...data, id: Math.max(0, ...list.map(t => t.id)) + 1 }]);
            setToast('Задача добавлена');
        }
        setModal(null);
    };

    const toggleTask = id => setTasks(list => list.map(t => {
        if (t.id !== id) return t;
        return t.status === 'done'
            ? { ...t, status: t.prevStatus ?? 'todo', prevStatus: undefined }
            : { ...t, prevStatus: t.status, status: 'done' };
    }));

    const toggleAll = done => {
        const ids = new Set(visible.map(t => t.id));
        setTasks(list => list.map(t => {
            if (!ids.has(t.id) || (t.status === 'done') === done) return t;
            return done ? { ...t, prevStatus: t.status, status: 'done' } : { ...t, status: t.prevStatus ?? 'todo' };
        }));
    };

    const deleteTask = task => {
        if (!window.confirm(`Удалить задачу «${task.title}»?`)) return;
        setTasks(list => list.filter(t => t.id !== task.id));
        setToast('Задача удалена');
    };

    const pickTag = value => {
        setTag(value);
        setTab('all');
        setSection('tasks');
    };

    const resetDemo = () => {
        localStorage.removeItem(STORAGE_KEY);
        setReloadKey(k => k + 1);
        setToast('Демонстрационные данные восстановлены');
    };

    const currentUser = { id: 'u1', fullName: userName, role: 'Студент', color: '#2563eb' };
    const hasFilters = search || tag !== 'all' || selectedDate;
    const emptyText = tasks.length === 0
        ? 'Задач пока нет — нажмите «Добавить задачу», чтобы создать первую.'
        : 'Ничего не найдено. Измените условия поиска или сбросьте фильтры.';

    let content;
    if (loading) {
        content = <div className="card state"><span className="spinner" /> Загрузка задач…</div>;
    } else if (error) {
        content = (
            <div className="card state state--error">
                <p>{error}</p>
                <button type="button" className="btn btn--primary" onClick={() => setReloadKey(k => k + 1)}>Повторить</button>
            </div>
        );
    } else if (section === 'calendar') {
        content = <CalendarView tasks={tasks} now={now} selectedDate={selectedDate} onSelectDate={setSelectedDate} />;
    } else if (section === 'stats') {
        content = <StatsView tasks={tasks} stats={stats} tagItems={tagItems} users={users} now={now} />;
    } else if (section === 'tags') {
        content = <TagsView tasks={tasks} tagItems={tagItems} onPick={pickTag} />;
    } else if (section === 'settings') {
        content = <SettingsView currentUser={currentUser} onRename={setUserName} onReset={resetDemo} />;
    } else {
        content = (
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
                                {search && <button type="button" onClick={() => setSearch('')}>«{search}» ×</button>}
                                {tag !== 'all' && <button type="button" onClick={() => setTag('all')}>метка: {tag} ×</button>}
                                {selectedDate && (
                                    <button type="button" onClick={() => setSelectedDate(null)}>дата: {formatShortDate(selectedDate)} ×</button>
                                )}
                            </div>
                        )}
                        <TaskTable tasks={visible} users={users} now={now} emptyText={emptyText}
                            onToggle={toggleTask} onToggleAll={toggleAll}
                            onEdit={task => setModal({ task })} onDelete={deleteTask} />
                    </section>
                </div>
                <div className="dashboard__side">
                    <Calendar tasks={tasks} now={now} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                    <TagProgress items={tagItems} donePercent={stats.donePercent} onTagClick={pickTag} />
                </div>
            </div>
        );
    }

    return (
        <div className={`app${menuOpen ? ' menu-open' : ''}`}>
            <Sidebar active={section} badges={{ tasks: alerts.length }}
                onSelect={id => { setSection(id); setMenuOpen(false); }} />
            <div className="backdrop" onClick={() => setMenuOpen(false)} />
            <main className="main">
                <TopBar
                    searchProps={{ search, onSearchChange: setSearch, tag, onTagChange: setTag, tags: TAGS }}
                    onAdd={() => setModal({ task: null })}
                    alerts={alerts}
                    now={now}
                    currentUser={currentUser}
                    onOpenTask={task => setModal({ task })}
                    onMenu={() => setMenuOpen(o => !o)}
                />
                {content}
            </main>
            {modal && (
                <TaskModal key={modal.task?.id ?? 'new'} task={modal.task} users={users}
                    defaultDate={selectedDate ?? now} onSave={saveTask} onClose={closeModal} />
            )}
            {toast && <div className="toast" role="status">{toast}</div>}
        </div>
    );
}
