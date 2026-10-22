"""Автоматическая проверка PWA «Мой список покупок» в Google Chrome (Playwright).

Запуск (сервер приложения должен работать на http://localhost:8013):
    pip install playwright
    python tests/pwa_check.py [URL]

Проверяется: манифест и иконки, устанавливаемость (данные Chrome через DevTools Protocol),
регистрация Service Worker, содержимое Cache Storage, сохранение данных в IndexedDB
и работа приложения после отключения сети.
"""
import json
import sys
import tempfile

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8013/"
results = []


def check(name, ok, details=""):
    results.append(ok)
    mark = "OK  " if ok else "FAIL"
    print(f"[{mark}] {name}" + (f": {details}" if details else ""))


with sync_playwright() as p:
    # обычный (не инкогнито) профиль: в режиме инкогнито Chrome не предлагает установку
    profile = tempfile.TemporaryDirectory(prefix="pwa_check_", ignore_cleanup_errors=True)
    context = p.chromium.launch_persistent_context(profile.name, channel="chrome",
                                                   viewport={"width": 1280, "height": 800}, locale="ru-RU")
    page = context.pages[0] if context.pages else context.new_page()
    page.goto(URL, wait_until="load")
    cdp = context.new_cdp_session(page)

    # 1. Манифест
    manifest = cdp.send("Page.getAppManifest")
    data = json.loads(manifest.get("data") or "{}")
    sizes = sorted({i["sizes"] for i in data.get("icons", [])}, key=lambda s: int(s.split("x")[0]))
    check("Манифест загружен", bool(data) and not manifest.get("errors"), manifest.get("url", ""))
    check("name / short_name", bool(data.get("name") and data.get("short_name")),
          f'{data.get("name")} / {data.get("short_name")}')
    check("display", data.get("display") == "standalone", data.get("display", ""))
    check("Иконки 192 и 512", {"192x192", "512x512"} <= set(sizes), ", ".join(sizes))

    # 2. Service Worker
    page.evaluate("navigator.serviceWorker.ready")
    page.reload(wait_until="load")  # после перезагрузки страница управляется Service Worker
    sw = page.evaluate("""async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return { scope: reg?.scope, state: reg?.active?.state, script: reg?.active?.scriptURL,
                 controlled: Boolean(navigator.serviceWorker.controller) };
    }""")
    check("Service Worker зарегистрирован", sw["state"] == "activated", f'scope {sw["scope"]}')
    check("Страница управляется Service Worker", sw["controlled"])

    # 3. Устанавливаемость с точки зрения Chrome
    errors = cdp.send("Page.getInstallabilityErrors").get("installabilityErrors", [])
    check("Приложение можно установить", not errors,
          "ошибок нет" if not errors else "; ".join(e["errorId"] for e in errors))
    check("Событие beforeinstallprompt → кнопка «Установить»", page.locator("#installBtn").is_visible())

    # 4. Кэш
    caches = page.evaluate("""async () => {
        const out = {};
        for (const key of await caches.keys()) out[key] = (await (await caches.open(key)).keys()).length;
        return out;
    }""")
    static = {k: v for k, v in caches.items() if "static" in k}
    check("Cache Storage заполнен", bool(static) and min(static.values()) >= 10,
          ", ".join(f"{k}: {v} файлов" for k, v in caches.items()))

    # 5. Данные сохраняются в IndexedDB и переживают перезагрузку
    page.fill("#itemName", "Проверочный товар")
    page.click("#addForm button[type=submit]")
    page.wait_for_selector(".item-name >> text=Проверочный товар")
    page.wait_for_timeout(300)
    page.reload(wait_until="load")
    page.wait_for_selector(".item")
    saved = page.locator(".item-name", has_text="Проверочный товар").count()
    check("Товар сохранился после перезагрузки", saved == 1, page.locator("#storageInfo").inner_text())

    # 6. Офлайн-режим
    context.set_offline(True)
    page.reload(wait_until="load")
    # Playwright сбрасывает navigator.onLine при перезагрузке — включаем эмуляцию повторно
    context.set_offline(False)
    context.set_offline(True)
    page.wait_for_timeout(300)
    offline_ok = page.locator(".item-name", has_text="Проверочный товар").count() == 1
    banner = page.locator("#offlineBanner").is_visible()
    check("Запуск без сети", offline_ok, "страница и данные загружены из кэша")
    check("Индикатор «Офлайн»", banner, page.locator("#netBadge").inner_text())
    page.fill("#itemName", "Добавлен без сети")
    page.click("#addForm button[type=submit]")
    page.wait_for_timeout(300)
    check("Добавление товара без сети", page.locator(".item-name", has_text="Добавлен без сети").count() == 1)
    context.set_offline(False)

    # убираем проверочные записи
    for name in ("Проверочный товар", "Добавлен без сети"):
        page.locator(".item", has_text=name).locator("[data-action=delete]").click()
    context.close()
    profile.cleanup()

print(f"\nИтого: {sum(results)} из {len(results)} проверок пройдено")
sys.exit(0 if all(results) else 1)
