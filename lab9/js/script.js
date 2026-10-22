'use strict';

// ===================== Данные приложения =====================

const CATEGORIES = [
    { id: 'fruits', name: 'Овощи и фрукты', color: '#2f9e44' },
    { id: 'dairy', name: 'Молочные продукты', color: '#1c7ed6' },
    { id: 'bakery', name: 'Хлеб и выпечка', color: '#e67700' },
    { id: 'meat', name: 'Мясо и рыба', color: '#e03131' },
    { id: 'grocery', name: 'Бакалея', color: '#7048e8' },
    { id: 'drinks', name: 'Напитки', color: '#0c8599' },
    { id: 'household', name: 'Бытовая химия', color: '#c2255c' },
    { id: 'other', name: 'Другое', color: '#495057' },
];

const FILTERS = ['all', 'active', 'bought'];
const SORTS = ['added', 'name', 'category', 'active-first'];
const STORAGE_KEY = 'pgtu-lab9-shopping-list';
const MAX_QTY = 99;

// Всё состояние приложения хранится в одном объекте;
// интерфейс перестраивается из него после каждого действия
const state = {
    items: [],          // { id, name, category, qty, bought, createdAt }
    filter: 'all',      // all | active | bought
    category: 'all',
    sort: 'added',
    nextId: 1,
    pendingItem: null,  // товар, ожидающий подтверждения при повторе названия
};

const ICON_DELETE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// ===================== Элементы страницы =====================

const els = {
    form: document.querySelector('#add-form'),
    name: document.querySelector('#item-name'),
    category: document.querySelector('#item-category'),
    qty: document.querySelector('#item-qty'),
    addBtn: document.querySelector('#add-btn'),
    message: document.querySelector('#form-message'),
    warning: document.querySelector('#duplicate-warning'),
    warningName: document.querySelector('#duplicate-name'),
    dupConfirm: document.querySelector('#dup-confirm'),
    dupCancel: document.querySelector('#dup-cancel'),
    list: document.querySelector('#list'),
    empty: document.querySelector('#empty-message'),
    filterButtons: document.querySelectorAll('.filter'),
    filterCounts: document.querySelectorAll('.filter__count'),
    categoryFilter: document.querySelector('#category-filter'),
    sortSelect: document.querySelector('#sort-select'),
    clearBought: document.querySelector('#clear-bought'),
    clearAll: document.querySelector('#clear-all'),
    statTotal: document.querySelector('#stat-total'),
    statBought: document.querySelector('#stat-bought'),
    statLeft: document.querySelector('#stat-left'),
    progress: document.querySelector('#progress'),
    progressBar: document.querySelector('#progress-bar'),
    progressLabel: document.querySelector('#progress-label'),
    toast: document.querySelector('#toast'),
};

// ===================== Вспомогательные функции =====================

function getCategory(id) {
    return CATEGORIES.find((category) => category.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// Приводим название к единому виду, чтобы «Молоко», « молоко » и «МОЛОКО» считались одним товаром
function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ё/g, 'е');
}

function plural(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
}

function findItem(id) {
    return state.items.find((item) => item.id === id);
}

function getItemElement(id) {
    return els.list.querySelector(`.item[data-id="${id}"]`);
}

// Перезапуск CSS-анимации: убрать класс, принудительно пересчитать стили, добавить снова
function restartAnimation(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
}

// Удаление узла после анимации исчезновения (с запасным таймером, если анимации отключены)
function animateOut(element, onDone) {
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        element.remove();
        if (onDone) onDone();
    };
    element.classList.add('item--leave');
    element.querySelectorAll('button, input').forEach((control) => { control.disabled = true; });
    element.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 600);
}

// ===================== Сохранение в localStorage (дополнительно) =====================

function saveState() {
    const data = {
        items: state.items,
        nextId: state.nextId,
        filter: state.filter,
        category: state.category,
        sort: state.sort,
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        // хранилище недоступно (приватный режим и т.п.) — приложение работает без сохранения
    }
}

function isValidItem(item) {
    return item && Number.isInteger(item.id) && typeof item.name === 'string' && item.name.trim() !== '';
}

function loadState() {
    let data = null;
    try {
        data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
        data = null;
    }
    if (!data || !Array.isArray(data.items)) return;

    state.items = data.items.filter(isValidItem).map((item) => ({
        id: item.id,
        name: item.name,
        category: getCategory(item.category).id,
        qty: Number.isInteger(item.qty) ? item.qty : 1,
        bought: Boolean(item.bought),
        createdAt: item.createdAt || Date.now(),
    }));
    const maxId = state.items.reduce((max, item) => Math.max(max, item.id), 0);
    state.nextId = Math.max(Number(data.nextId) || 1, maxId + 1);
    if (FILTERS.includes(data.filter)) state.filter = data.filter;
    if (data.category === 'all' || CATEGORIES.some((c) => c.id === data.category)) state.category = data.category;
    if (SORTS.includes(data.sort)) state.sort = data.sort;
}

// ===================== Создание элементов DOM =====================

function fillCategorySelects() {
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Все категории';
    els.categoryFilter.append(allOption);

    for (const category of CATEGORIES) {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        els.category.append(option);
        els.categoryFilter.append(option.cloneNode(true));
    }
}

function createItemElement(item) {
    const category = getCategory(item.category);

    const li = document.createElement('li');
    li.className = 'item';
    li.dataset.id = item.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item__check';
    checkbox.id = `item-check-${item.id}`;
    checkbox.checked = item.bought;

    const body = document.createElement('div');
    body.className = 'item__body';

    // название — это label, поэтому клик по нему тоже переключает отметку
    const name = document.createElement('label');
    name.className = 'item__name';
    name.htmlFor = checkbox.id;
    name.textContent = item.name;

    const meta = document.createElement('div');
    meta.className = 'item__meta';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.style.setProperty('--badge-color', category.color);
    badge.textContent = category.name;
    meta.append(badge);

    if (item.qty > 1) {
        const qty = document.createElement('span');
        qty.className = 'item__qty';
        qty.textContent = `${item.qty} шт.`;
        meta.append(qty);
    }

    body.append(name, meta);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'item__delete';
    deleteBtn.setAttribute('aria-label', `Удалить «${item.name}»`);
    deleteBtn.title = 'Удалить';
    deleteBtn.innerHTML = ICON_DELETE;

    li.append(checkbox, body, deleteBtn);
    li.classList.toggle('is-bought', item.bought);
    return li;
}

// ===================== Отображение состояния =====================

function matchesFilter(item) {
    const statusOk = state.filter === 'all'
        || (state.filter === 'active' && !item.bought)
        || (state.filter === 'bought' && item.bought);
    const categoryOk = state.category === 'all' || item.category === state.category;
    return statusOk && categoryOk;
}

// Фильтрация: показываем/скрываем уже существующие строки списка
function applyFilter() {
    let visible = 0;
    for (const item of state.items) {
        const li = getItemElement(item.id);
        if (!li) continue;
        const show = matchesFilter(item);
        li.hidden = !show;
        if (show) visible += 1;
    }
    updateEmptyState(visible);
}

function updateEmptyState(visible) {
    if (state.items.length === 0) {
        els.empty.textContent = 'Список пуст. Добавьте первый товар с помощью формы выше.';
        els.empty.hidden = false;
    } else if (visible === 0) {
        els.empty.textContent = 'В выбранном фильтре товаров нет. Выберите «Все», чтобы увидеть весь список.';
        els.empty.hidden = false;
    } else {
        els.empty.hidden = true;
    }
}

const COMPARATORS = {
    added: (a, b) => a.id - b.id,
    name: (a, b) => a.name.localeCompare(b.name, 'ru'),
    category: (a, b) => CATEGORIES.indexOf(getCategory(a.category)) - CATEGORIES.indexOf(getCategory(b.category))
        || a.name.localeCompare(b.name, 'ru'),
    'active-first': (a, b) => Number(a.bought) - Number(b.bought) || a.id - b.id,
};

// Сортировка: переставляем существующие узлы в нужном порядке (append перемещает узел)
function applySort() {
    const sorted = [...state.items].sort(COMPARATORS[state.sort]);
    for (const item of sorted) {
        const li = getItemElement(item.id);
        if (li) els.list.append(li);
    }
}

function setStat(element, value) {
    const text = String(value);
    if (element.textContent !== text) {
        element.textContent = text;
        restartAnimation(element, 'is-bump');
    }
}

// Пересчёт счётчиков, прогресса и доступности кнопок
function updateStats() {
    const total = state.items.length;
    const bought = state.items.filter((item) => item.bought).length;
    const left = total - bought;
    const counts = { all: total, active: left, bought };

    setStat(els.statTotal, total);
    setStat(els.statBought, bought);
    setStat(els.statLeft, left);
    els.filterCounts.forEach((badge) => { badge.textContent = counts[badge.dataset.count]; });

    const percent = total === 0 ? 0 : Math.round((bought / total) * 100);
    els.progressBar.style.width = `${percent}%`;
    els.progress.setAttribute('aria-valuenow', String(percent));
    els.progress.classList.toggle('is-complete', total > 0 && bought === total);

    if (total === 0) {
        els.progressLabel.textContent = 'Список пока пуст';
    } else if (bought === total) {
        els.progressLabel.textContent = `Все покупки сделаны: ${total} ${plural(total, ['товар', 'товара', 'товаров'])}`;
    } else {
        els.progressLabel.textContent = `Куплено ${bought} из ${total} (${percent}%), осталось ${left}`;
    }

    els.clearBought.disabled = bought === 0;
    els.clearAll.disabled = total === 0;
}

// Вызывается после любого изменения данных: интерфейс синхронизируется с состоянием
function afterChange() {
    applySort();
    applyFilter();
    updateStats();
    saveState();
}

function syncControls() {
    els.filterButtons.forEach((button) => {
        const active = button.dataset.filter === state.filter;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    els.categoryFilter.value = state.category;
    els.sortSelect.value = state.sort;
}

// ===================== Сообщения =====================

let toastTimer = null;

function showToast(text, type = 'info') {
    els.toast.textContent = text;
    els.toast.className = `toast toast--${type} is-visible`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 2600);
}

function showFormError(text, field) {
    els.message.textContent = text;
    els.message.hidden = false;
    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
    restartAnimation(field, 'is-shaking');
    field.focus();
}

function clearFormError() {
    els.message.hidden = true;
    for (const field of [els.name, els.qty]) {
        field.classList.remove('is-invalid', 'is-shaking');
        field.removeAttribute('aria-invalid');
    }
}

function validateInput(name, qty) {
    if (name === '') {
        return { field: els.name, text: 'Введите название товара — пустое название не принимается.' };
    }
    if (name.length < 2) {
        return { field: els.name, text: 'Название слишком короткое: нужно хотя бы 2 символа.' };
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        return { field: els.qty, text: `Количество должно быть целым числом от 1 до ${MAX_QTY}.` };
    }
    return null;
}

function highlightItem(id) {
    const li = getItemElement(id);
    if (!li) return;
    li.hidden = false;
    restartAnimation(li, 'is-highlight');
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setTimeout(() => li.classList.remove('is-highlight'), 2500);
}

function showDuplicateWarning(draft, existing) {
    state.pendingItem = draft;
    els.warningName.textContent = existing.name;
    els.warning.hidden = false;
    els.addBtn.disabled = true;       // пока пользователь не решил — повторно добавить нельзя
    highlightItem(existing.id);
    els.dupConfirm.focus();
}

function hideDuplicateWarning() {
    state.pendingItem = null;
    els.warning.hidden = true;
    els.addBtn.disabled = false;
}

// ===================== Действия пользователя =====================

function addItem(draft) {
    const item = {
        id: state.nextId,
        name: draft.name,
        category: draft.category,
        qty: draft.qty,
        bought: false,
        createdAt: Date.now(),
    };
    state.nextId += 1;
    state.items.push(item);

    const li = createItemElement(item);
    li.classList.add('item--enter');
    li.addEventListener('animationend', () => li.classList.remove('item--enter'), { once: true });
    els.list.append(li);

    // если новый товар скрыт текущим фильтром — переключаемся на «Все», чтобы его было видно
    if (!matchesFilter(item)) {
        state.filter = 'all';
        state.category = 'all';
        syncControls();
    }
    afterChange();

    els.name.value = '';
    els.qty.value = '1';
    els.name.focus();
    showToast(`Добавлено: ${item.name}`, 'success');
}

function toggleItem(id) {
    const item = findItem(id);
    if (!item) {
        showToast('Товар не найден — возможно, он уже удалён', 'error');
        return;
    }
    item.bought = !item.bought;

    const li = getItemElement(id);
    li.classList.toggle('is-bought', item.bought);
    li.querySelector('.item__check').checked = item.bought;
    restartAnimation(li, 'item--pulse');

    // небольшая пауза, чтобы отметка была видна до того, как фильтр скроет строку
    updateStats();
    saveState();
    setTimeout(() => {
        applySort();
        applyFilter();
    }, state.filter === 'all' ? 0 : 350);

    showToast(item.bought ? `Куплено: ${item.name}` : `Снова в списке: ${item.name}`, item.bought ? 'success' : 'info');
}

function removeItems(ids) {
    const removed = [];
    for (const id of ids) {
        const index = state.items.findIndex((item) => item.id === id);
        if (index === -1) continue;
        removed.push(...state.items.splice(index, 1));
        const li = getItemElement(id);
        if (li) animateOut(li, applyFilter);
    }
    updateStats();
    saveState();
    return removed;
}

function removeItem(id) {
    const [removed] = removeItems([id]);
    if (!removed) {
        showToast('Нельзя удалить: товар не найден', 'error');
        return;
    }
    showToast(`Удалено: ${removed.name}`, 'info');
}

function clearBought() {
    const ids = state.items.filter((item) => item.bought).map((item) => item.id);
    if (ids.length === 0) {
        showToast('Купленных товаров нет', 'error');
        return;
    }
    removeItems(ids);
    showToast(`Удалено купленных: ${ids.length}`, 'info');
}

// Очистка всего списка требует подтверждения: первое нажатие переводит кнопку в «опасное» состояние
let clearConfirmTimer = null;

function resetClearAllButton() {
    els.clearAll.classList.remove('is-confirm');
    els.clearAll.textContent = 'Очистить список';
    clearTimeout(clearConfirmTimer);
}

function clearAll() {
    if (!els.clearAll.classList.contains('is-confirm')) {
        els.clearAll.classList.add('is-confirm');
        els.clearAll.textContent = 'Нажмите ещё раз, чтобы очистить';
        clearConfirmTimer = setTimeout(resetClearAllButton, 3000);
        return;
    }
    resetClearAllButton();
    const count = state.items.length;
    removeItems(state.items.map((item) => item.id));
    showToast(`Список очищен (${count} ${plural(count, ['товар', 'товара', 'товаров'])})`, 'info');
}

function setFilter(filter) {
    if (!FILTERS.includes(filter)) return;
    state.filter = filter;
    syncControls();
    applyFilter();
    saveState();
}

// ===================== Обработчики событий =====================

els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.pendingItem) return;

    clearFormError();
    const name = els.name.value.trim().replace(/\s+/g, ' ');
    const qty = Number(els.qty.value);

    const error = validateInput(name, qty);
    if (error) {
        showFormError(error.text, error.field);
        return;
    }

    const draft = { name, category: els.category.value, qty };
    const duplicate = state.items.find((item) => normalizeName(item.name) === normalizeName(name));
    if (duplicate) {
        showDuplicateWarning(draft, duplicate);
        return;
    }
    addItem(draft);
});

[els.name, els.qty].forEach((field) => {
    field.addEventListener('input', () => {
        if (field.classList.contains('is-invalid')) clearFormError();
    });
});

els.dupConfirm.addEventListener('click', () => {
    const draft = state.pendingItem;
    hideDuplicateWarning();
    if (draft) addItem(draft);
});

els.dupCancel.addEventListener('click', () => {
    hideDuplicateWarning();
    els.name.select();
    els.name.focus();
    showToast('Повторный товар не добавлен', 'info');
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.pendingItem) els.dupCancel.click();
});

// Делегирование событий: один обработчик на весь список, а не на каждую строку
els.list.addEventListener('change', (event) => {
    if (!event.target.matches('.item__check')) return;
    const li = event.target.closest('.item');
    toggleItem(Number(li.dataset.id));
});

els.list.addEventListener('click', (event) => {
    const button = event.target.closest('.item__delete');
    if (!button) return;
    const li = button.closest('.item');
    removeItem(Number(li.dataset.id));
});

els.filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
});

els.categoryFilter.addEventListener('change', () => {
    state.category = els.categoryFilter.value;
    applyFilter();
    saveState();
});

els.sortSelect.addEventListener('change', () => {
    state.sort = els.sortSelect.value;
    applySort();
    saveState();
});

els.clearBought.addEventListener('click', clearBought);
els.clearAll.addEventListener('click', clearAll);

// ===================== Запуск =====================

function init() {
    fillCategorySelects();
    loadState();
    els.list.replaceChildren(...state.items.map(createItemElement));
    syncControls();
    afterChange();
}

init();
