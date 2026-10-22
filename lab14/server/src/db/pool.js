// Пул подключений к PostgreSQL. Параметры берутся только из переменных окружения.
const { Pool, types } = require('pg');

// NUMERIC и BIGINT (count(*)) возвращаем числами, а не строками
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
// DATE отдаём строкой ГГГГ-ММ-ДД, чтобы не было сдвига из-за часового пояса
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
});

pool.on('error', (err) => console.error('[db] ошибка простаивающего подключения:', err.message));

const query = (text, params) => pool.query(text, params);

// Выполнение нескольких запросов в одной транзакции
async function transaction(fn) {
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

module.exports = { pool, query, transaction };
