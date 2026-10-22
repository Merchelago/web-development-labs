// Возможности PWA: Service Worker, обновление, установка, состояние сети.
import { showToast } from './ui.js';

export const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// Регистрация Service Worker и сценарий обновления новой версии
export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        setSwInfo('Service Worker не поддерживается браузером');
        return null;
    }
    try {
        const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });

        // новая версия уже скачана и ждёт активации
        if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);

        registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
            });
        });

        // после «Обновить» новая версия берёт управление — перезагружаем страницу один раз
        // (при самой первой установке clients.claim() тоже вызывает controllerchange, но там перезагрузка не нужна)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!updateRequested) {
                navigator.serviceWorker.controller?.postMessage({ type: 'GET_VERSION' });
                return;
            }
            updateRequested = false;
            window.location.reload();
        });

        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'VERSION') updateSwInfo(event.data);
        });
        await navigator.serviceWorker.ready;
        navigator.serviceWorker.controller?.postMessage({ type: 'GET_VERSION' });
        if (!navigator.serviceWorker.controller) setSwInfo('Service Worker: установлен, управляет со следующей загрузки');
        return registration;
    } catch (error) {
        setSwInfo(`Service Worker: ошибка регистрации (${error.message})`);
        return null;
    }
}

let updateRequested = false;

function offerUpdate(worker) {
    showToast('Доступна новая версия приложения', {
        actionText: 'Обновить',
        timeout: 0,
        onAction: () => {
            updateRequested = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
        },
    });
}

async function updateSwInfo({ version, cache }) {
    let files = '';
    if ('caches' in window) {
        const keys = await (await caches.open(cache)).keys();
        files = ` · в кэше ${keys.length} файлов`;
    }
    setSwInfo(`Service Worker: активен (${version})${files}`);
}

function setSwInfo(text) {
    document.getElementById('swInfo').textContent = text;
}

// Кнопка «Установить»: браузер присылает beforeinstallprompt, когда приложение можно установить
export function setupInstall() {
    const button = document.getElementById('installBtn');
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        button.hidden = false;
    });

    button.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        button.hidden = true;
        if (outcome === 'accepted') showToast('Приложение устанавливается на устройство');
    });

    window.addEventListener('appinstalled', () => {
        button.hidden = true;
        showToast('Готово! «Покупки» появились среди приложений');
    });

    // На iPhone/iPad нет beforeinstallprompt — подсказываем ручную установку
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !isStandalone()) document.getElementById('iosHint').hidden = false;

    document.getElementById('modeInfo').textContent = isStandalone()
        ? 'Режим: установленное приложение'
        : 'Режим: вкладка браузера';
}

// Индикатор сети
export function setupNetworkStatus() {
    const badge = document.getElementById('netBadge');
    const banner = document.getElementById('offlineBanner');
    const update = () => {
        const online = navigator.onLine;
        badge.textContent = online ? 'Онлайн' : 'Офлайн';
        badge.classList.toggle('offline', !online);
        banner.hidden = online;
    };
    window.addEventListener('online', () => {
        update();
        showToast('Соединение восстановлено');
    });
    window.addEventListener('offline', update);
    update();
}
