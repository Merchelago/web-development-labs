import pg from 'pg';
import { config } from '../config.js';

// Пул соединений: соединения переиспользуются между запросами вместо открытия нового на каждый запрос
export const pool = new pg.Pool({
    ...config.db,
    max: 10,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
});

pool.on('error', err => {
    console.error('Ошибка простаивающего соединения с PostgreSQL:', err.message);
});

/** Параметризованный запрос: значения передаются отдельно от текста SQL ($1, $2…), что исключает SQL-инъекции. */
export function query(text, params = []) {
    return pool.query(text, params);
}

/** Выполнение нескольких запросов в одной транзакции. */
export async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
