import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db/database.js';

const server = app.listen(config.port, async () => {
    console.log(`API «Список задач» запущено: http://localhost:${config.port}/api`);
    try {
        const { rows } = await pool.query('SELECT current_database() AS db, version() AS v');
        console.log(`PostgreSQL: база «${rows[0].db}», ${rows[0].v.split(',')[0]}`);
    } catch (err) {
        console.error(`Внимание: нет соединения с PostgreSQL (${err.code || err.message}). API будет отвечать 503.`);
    }
});

// корректное завершение: дожидаемся текущих запросов и закрываем пул соединений
function shutdown() {
    console.log('Остановка сервера…');
    server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
