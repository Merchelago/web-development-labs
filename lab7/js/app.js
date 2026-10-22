// Переключение представления Desktop / Mobile.
// Раскладку меняет CSS (медиазапрос max-width: 768px и атрибут data-view),
// скрипт только запоминает выбор пользователя и подсвечивает активную кнопку.

const BREAKPOINT = 768;
const root = document.documentElement;
const buttons = document.querySelectorAll(".view-switch__btn");
const fab = document.querySelector(".view-fab");
const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINT}px)`);

// Какая раскладка применена сейчас: выбранная вручную или по ширине окна
function currentLayout() {
    const view = root.dataset.view;
    if (view === "desktop" || view === "mobile") {
        return view;
    }
    return mobileQuery.matches ? "mobile" : "desktop";
}

function updateSwitch() {
    root.dataset.layout = currentLayout();
    buttons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.view === root.dataset.view));
    });
}

function setView(view) {
    root.dataset.view = view;
    try {
        sessionStorage.setItem("taskflow-view", view);
    } catch (e) {
        // хранилище недоступно (приватный режим) — выбор просто не запомнится
    }
    updateSwitch();
}

// Ручное переключение кнопками в шапке (и плавающей кнопкой возврата)
[...buttons, fab].forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
});

// Автоматическое переключение при изменении ширины окна (пересечение 768px)
mobileQuery.addEventListener("change", updateSwitch);

let savedView = "auto";
try {
    savedView = sessionStorage.getItem("taskflow-view") || "auto";
} catch (e) {
    savedView = "auto";
}
setView(savedView);
