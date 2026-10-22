// ВолгаТех-2026. Здесь только штатная инициализация компонентов Bootstrap:
// подсказки (tooltip), проверка форм (validation) и уведомления (alert).
// Логика приложения будет добавлена в следующей практической работе.

const MESSAGES = {
    regForm: {
        box: "regAlertBox",
        html: '<i class="bi bi-check-circle-fill me-2"></i><strong>Заявка отправлена!</strong> Подтверждение придёт на указанную почту.',
    },
    subscribeForm: {
        box: "subscribeAlertBox",
        html: '<i class="bi bi-check2 me-1"></i>Вы подписаны на новости ВолгаТех-2026.',
    },
};

// Закрываемое уведомление Bootstrap; при закрытии Bootstrap сам удаляет его из DOM
function showAlert(boxId, html) {
    const box = document.getElementById(boxId);
    box.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show small mb-0" role="alert">
            ${html}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Закрыть"></button>
        </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
    // Bootstrap tooltip требует явной инициализации
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
        .forEach((el) => new bootstrap.Tooltip(el));

    // Стандартный приём проверки форм Bootstrap: класс .was-validated + .invalid-feedback
    document.querySelectorAll(".needs-validation").forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.checkValidity()) {
                event.stopPropagation();
                form.classList.add("was-validated");
                return;
            }
            // данные никуда не отправляются — только показываем уведомление
            const msg = MESSAGES[form.id];
            showAlert(msg.box, msg.html);
            form.classList.remove("was-validated");
            form.reset();
        });

        form.addEventListener("reset", () => form.classList.remove("was-validated"));
    });

    // мобильное меню закрывается после выбора пункта
    const menu = document.getElementById("navMenu");
    menu.querySelectorAll(".nav-link:not(.dropdown-toggle), .dropdown-item, .btn").forEach((link) => {
        link.addEventListener("click", () => {
            if (menu.classList.contains("show")) {
                bootstrap.Collapse.getOrCreateInstance(menu).hide();
            }
        });
    });
});
