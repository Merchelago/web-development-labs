require('dotenv').config();
const app = require('./app');
const { pool } = require('./db/pool');

const PORT = Number(process.env.PORT || 3014);

for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Не задана переменная окружения ${key}. Скопируйте .env.example в .env и заполните его.`);
    process.exit(1);
  }
}

const server = app.listen(PORT, () => console.log(`SafeVision API запущен: http://localhost:${PORT}/api`));

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
