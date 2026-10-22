// Локальное хранилище списка: IndexedDB, при её недоступности — localStorage.
const DB_NAME = 'shopping-list';
const DB_VERSION = 1;
const STORE = 'items';
const LS_KEY = 'shopping-list-items';

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function tx(db, mode, action) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const result = action(transaction.objectStore(STORE));
        transaction.oncomplete = () => resolve(result?.result);
        transaction.onerror = () => reject(transaction.error);
    });
}

const indexedDbStorage = {
    kind: 'IndexedDB',
    db: null,
    async init() {
        this.db = await openDb();
    },
    async getAll() {
        return tx(this.db, 'readonly', (store) => store.getAll());
    },
    async put(item) {
        await tx(this.db, 'readwrite', (store) => store.put(item));
    },
    async remove(id) {
        await tx(this.db, 'readwrite', (store) => store.delete(id));
    },
    async removeMany(ids) {
        await tx(this.db, 'readwrite', (store) => ids.forEach((id) => store.delete(id)));
    },
};

const localStorageFallback = {
    kind: 'localStorage',
    async init() {},
    read() {
        try {
            return JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
        } catch {
            return [];
        }
    },
    write(items) {
        localStorage.setItem(LS_KEY, JSON.stringify(items));
    },
    async getAll() {
        return this.read();
    },
    async put(item) {
        const items = this.read().filter((i) => i.id !== item.id);
        this.write([...items, item]);
    },
    async remove(id) {
        this.write(this.read().filter((i) => i.id !== id));
    },
    async removeMany(ids) {
        this.write(this.read().filter((i) => !ids.includes(i.id)));
    },
};

export async function createStorage() {
    if ('indexedDB' in window) {
        try {
            await indexedDbStorage.init();
            return indexedDbStorage;
        } catch (error) {
            console.warn('IndexedDB недоступна, используется localStorage', error);
        }
    }
    await localStorageFallback.init();
    return localStorageFallback;
}

// Небольшие пользовательские настройки (выбранный фильтр) — в localStorage
export const prefs = {
    get(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(`shopping-pref-${key}`)) ?? fallback;
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(`shopping-pref-${key}`, JSON.stringify(value));
        } catch {
            /* приватный режим — настройки просто не запомнятся */
        }
    },
};
