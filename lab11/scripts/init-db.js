// Создание таблиц и заполнение демо-данными: npm run db:init  (для тестовой базы: NODE_ENV=test)
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { pool } from '../src/db/database.js';

const dir = new URL('../sql/', import.meta.url);

export async function initDb() {
    for (const file of ['schema.sql', 'seed.sql']) {
        await pool.query(await readFile(new URL(file, dir), 'utf8'));
    }
}

// запуск как отдельного скрипта (а не импорт из тестов)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    initDb()
        .then(() => console.log(`База «${pool.options.database}» создана и заполнена демо-данными`))
        .catch(err => { console.error('Ошибка инициализации БД:', err.message); process.exitCode = 1; })
        .finally(() => pool.end());
}
