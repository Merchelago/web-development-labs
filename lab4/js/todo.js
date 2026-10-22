// SVG-иконка «корзина» для кнопки удаления задачи
const TRASH_ICON = `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6M14 11v6"/>
    </svg>`;

window.onload = function () {
    const input = document.querySelector('#newtask input');
    const tasks = document.querySelector('#tasks');

    function addTask() {
        const text = input.value.trim();
        if (text.length == 0) {
            alert("Введите описание задачи!");
            return;
        }

        const task = document.createElement('div');
        task.className = 'task';

        const name = document.createElement('span');
        name.className = 'taskname';
        name.textContent = text;          // textContent — без вставки HTML из поля ввода

        const del = document.createElement('button');
        del.className = 'delete';
        del.title = 'Удалить задачу';
        del.innerHTML = TRASH_ICON;
        del.onclick = function () {
            task.remove();
        };

        task.append(name, del);
        tasks.append(task);
        input.value = '';
        input.focus();
    }

    document.querySelector('#push').onclick = addTask;
    input.addEventListener('keydown', function (e) {
        if (e.key == 'Enter') {
            addTask();
        }
    });
};
