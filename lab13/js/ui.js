// Отрисовка интерфейса: список товаров, счётчики, уведомления.
export const CATEGORIES = [
    { id: 'veg', name: 'Овощи и фрукты', icon: '🥦', color: '#4caf50' },
    { id: 'dairy', name: 'Молочные продукты', icon: '🥛', color: '#42a5f5' },
    { id: 'bakery', name: 'Хлеб и выпечка', icon: '🍞', color: '#d4a03c' },
    { id: 'meat', name: 'Мясо и рыба', icon: '🍗', color: '#e57373' },
    { id: 'grocery', name: 'Бакалея', icon: '🍝', color: '#ab8a5c' },
    { id: 'drinks', name: 'Напитки', icon: '🧃', color: '#ff9800' },
    { id: 'home', name: 'Бытовая химия', icon: '🧴', color: '#9575cd' },
    { id: 'other', name: 'Другое', icon: '📦', color: '#90a4ae' },
];

export const UNITS = ['шт', 'кг', 'г', 'л', 'уп'];

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.at(-1);

export function fillSelect(select, options, { withAll = false } = {}) {
    select.replaceChildren();
    if (withAll) select.append(new Option('Все категории', 'all'));
    options.forEach((opt) => select.append(typeof opt === 'string'
        ? new Option(opt, opt)
        : new Option(`${opt.icon} ${opt.name}`, opt.id)));
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const EDIT_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Zm11-15 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const DELETE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Элемент списка собирается через DOM API: пользовательский текст попадает только в textContent
export function createItemElement(item) {
    const cat = categoryById(item.category);
    const li = document.createElement('li');
    li.className = `item${item.bought ? ' bought' : ''}`;
    li.dataset.id = item.id;
    li.style.setProperty('--cat-color', cat.color);

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.dataset.action = 'toggle';
    check.setAttribute('aria-pressed', String(item.bought));
    check.setAttribute('aria-label', item.bought ? `Вернуть «${item.name}» в список` : `Отметить «${item.name}» как купленный`);
    check.innerHTML = `<span class="check-box">${CHECK_SVG}</span>`;

    const body = document.createElement('div');
    body.className = 'item-body';
    const name = document.createElement('p');
    name.className = 'item-name';
    name.textContent = item.name;
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const qty = document.createElement('span');
    qty.textContent = `${item.qty} ${item.unit}`;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `${cat.icon} ${cat.name}`;
    meta.append(qty, badge);
    body.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.innerHTML = `
        <button type="button" class="icon-btn" data-action="edit" aria-label="Редактировать">${EDIT_SVG}</button>
        <button type="button" class="icon-btn danger" data-action="delete" aria-label="Удалить">${DELETE_SVG}</button>`;

    li.append(check, body, actions);
    return li;
}

export function pluralItems(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'товар';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара';
    return 'товаров';
}

let toastTimer;
export function showToast(text, { actionText = '', onAction = null, timeout = 4000 } = {}) {
    const toast = document.getElementById('toast');
    const action = document.getElementById('toastAction');
    document.getElementById('toastText').textContent = text;
    action.textContent = actionText;
    action.onclick = onAction ? () => {
        toast.hidden = true;
        onAction();
    } : null;
    toast.hidden = false;
    clearTimeout(toastTimer);
    if (timeout) toastTimer = setTimeout(() => { toast.hidden = true; }, timeout);
}
