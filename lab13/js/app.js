// Логика списка покупок: состояние, обработчики событий, сохранение.
import { createStorage, prefs } from './db.js';
import {
    CATEGORIES, UNITS, categoryById, createItemElement, fillSelect, pluralItems, showToast,
} from './ui.js';
import { registerServiceWorker, setupInstall, setupNetworkStatus } from './pwa.js';

const $ = (id) => document.getElementById(id);

const state = {
    items: [],
    filter: prefs.get('filter', 'all'), // all | active | bought
    category: prefs.get('category', 'all'),
    search: '',
    editingId: null,
};

let storage;

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function validate(name, qty) {
    if (!name) return 'Введите название товара';
    if (name.length > 60) return 'Название не длиннее 60 символов';
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) return 'Количество — целое число от 1 до 999';
    return '';
}

function showError(el, input, message) {
    el.textContent = message;
    el.hidden = !message;
    input?.setAttribute('aria-invalid', String(Boolean(message)));
}

// ---------- Отрисовка ----------
function visibleItems() {
    const query = state.search.trim().toLowerCase();
    return state.items
        .filter((i) => (state.filter === 'active' ? !i.bought : state.filter === 'bought' ? i.bought : true))
        .filter((i) => state.category === 'all' || i.category === state.category)
        .filter((i) => !query || i.name.toLowerCase().includes(query))
        // сначала некупленные, внутри — по категориям и времени добавления
        .sort((a, b) => Number(a.bought) - Number(b.bought)
            || CATEGORIES.indexOf(categoryById(a.category)) - CATEGORIES.indexOf(categoryById(b.category))
            || a.createdAt - b.createdAt);
}

function render() {
    const total = state.items.length;
    const bought = state.items.filter((i) => i.bought).length;
    const left = total - bought;

    $('leftCount').textContent = left;
    $('boughtCount').textContent = bought;
    $('totalCount').textContent = total;
    $('progressBar').style.width = total ? `${(bought / total) * 100}%` : '0';
    $('summaryText').textContent = total
        ? (left ? `Осталось купить: ${left} ${pluralItems(left)}` : 'Всё куплено!')
        : 'Список пуст';
    document.title = left ? `(${left}) Мой список покупок` : 'Мой список покупок';

    const counts = { all: total, active: left, bought };
    document.querySelectorAll('.chip').forEach((chip) => {
        chip.setAttribute('aria-pressed', String(chip.dataset.filter === state.filter));
    });
    document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = counts[el.dataset.count]; });
    $('categoryFilter').value = state.category;
    $('clearBought').disabled = bought === 0;

    const list = $('itemsList');
    const items = visibleItems();
    list.replaceChildren(...items.map(createItemElement));
    $('emptyState').hidden = items.length > 0;
    $('emptyText').textContent = total
        ? 'По выбранному фильтру ничего не найдено.'
        : 'Список пуст — добавьте первый товар.';
}

// ---------- Действия ----------
async function addItem(event) {
    event.preventDefault();
    const nameInput = $('itemName');
    const name = nameInput.value.trim();
    const qty = Number($('itemQty').value);
    const error = validate(name, qty);
    showError($('addError'), nameInput, error);
    if (error) {
        nameInput.focus();
        return;
    }
    const now = Date.now();
    const item = {
        id: newId(), name, qty, unit: $('itemUnit').value, category: $('itemCategory').value,
        bought: false, createdAt: now, updatedAt: now,
    };
    // интерфейс обновляется сразу, запись в IndexedDB идёт следом
    state.items.push(item);
    nameInput.value = '';
    $('itemQty').value = 1;
    nameInput.focus();
    render();
    await persist(() => storage.put(item));
}

async function persist(operation) {
    try {
        await operation();
    } catch (error) {
        console.error(error);
        showToast('Не удалось сохранить изменения на устройстве');
    }
}

async function toggleItem(item) {
    item.bought = !item.bought;
    item.updatedAt = Date.now();
    await storage.put(item);
    render();
}

async function deleteItem(item) {
    state.items = state.items.filter((i) => i.id !== item.id);
    await storage.remove(item.id);
    render();
    showToast(`«${item.name}» удалён из списка`, {
        actionText: 'Отменить',
        onAction: async () => {
            state.items.push(item);
            await storage.put(item);
            render();
        },
    });
}

async function clearBought() {
    const bought = state.items.filter((i) => i.bought);
    if (!bought.length) return;
    state.items = state.items.filter((i) => !i.bought);
    await storage.removeMany(bought.map((i) => i.id));
    render();
    showToast(`Удалено купленных: ${bought.length}`, {
        actionText: 'Отменить',
        onAction: async () => {
            state.items.push(...bought);
            await Promise.all(bought.map((i) => storage.put(i)));
            render();
        },
    });
}

function openEdit(item) {
    state.editingId = item.id;
    $('editName').value = item.name;
    $('editQty').value = item.qty;
    $('editUnit').value = item.unit;
    $('editCategory').value = item.category;
    showError($('editError'), $('editName'), '');
    $('editDialog').showModal();
    $('editName').focus();
}

async function saveEdit(event) {
    event.preventDefault();
    const item = state.items.find((i) => i.id === state.editingId);
    if (!item) return;
    const name = $('editName').value.trim();
    const qty = Number($('editQty').value);
    const error = validate(name, qty);
    showError($('editError'), $('editName'), error);
    if (error) return;
    Object.assign(item, {
        name, qty, unit: $('editUnit').value, category: $('editCategory').value, updatedAt: Date.now(),
    });
    await storage.put(item);
    $('editDialog').close();
    render();
}

// ---------- Подписки на события ----------
function bindEvents() {
    $('addForm').addEventListener('submit', addItem);
    $('itemName').addEventListener('input', () => showError($('addError'), $('itemName'), ''));

    // делегирование: один обработчик на весь список
    $('itemsList').addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const item = state.items.find((i) => i.id === button.closest('.item').dataset.id);
        if (!item) return;
        if (button.dataset.action === 'toggle') toggleItem(item);
        if (button.dataset.action === 'edit') openEdit(item);
        if (button.dataset.action === 'delete') deleteItem(item);
    });

    document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
        state.filter = chip.dataset.filter;
        prefs.set('filter', state.filter);
        render();
    }));
    $('categoryFilter').addEventListener('change', (event) => {
        state.category = event.target.value;
        prefs.set('category', state.category);
        render();
    });
    $('search').addEventListener('input', (event) => {
        state.search = event.target.value;
        render();
    });
    $('clearBought').addEventListener('click', clearBought);

    $('editForm').addEventListener('submit', saveEdit);
    $('editCancel').addEventListener('click', () => $('editDialog').close());
}

async function init() {
    fillSelect($('itemUnit'), UNITS);
    fillSelect($('editUnit'), UNITS);
    fillSelect($('itemCategory'), CATEGORIES);
    fillSelect($('editCategory'), CATEGORIES);
    fillSelect($('categoryFilter'), CATEGORIES, { withAll: true });

    storage = await createStorage();
    state.items = await storage.getAll();
    $('storageInfo').textContent = `Хранилище: ${storage.kind}`;
    bindEvents();
    render();

    // ярлык «Добавить товар» из манифеста открывает приложение с ?action=add
    if (new URLSearchParams(window.location.search).get('action') === 'add') $('itemName').focus();

    setupNetworkStatus();
    setupInstall();
    registerServiceWorker();
}

init();
