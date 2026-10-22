// Создание структуры БД и загрузка демонстрационных данных: npm run db:init
// База (DB_NAME) должна существовать: CREATE DATABASE lab14_safevision;
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');

(async () => {
  const sqlDir = path.join(__dirname, '..', 'sql');
  try {
    for (const file of ['schema.sql', 'seed.sql']) {
      await pool.query(fs.readFileSync(path.join(sqlDir, file), 'utf8'));
      console.log(`✔ ${file}`);
    }
    const { rows } = await pool.query(
      'SELECT (SELECT count(*) FROM employees) AS employees, (SELECT count(*) FROM violations) AS violations, (SELECT count(*) FROM cameras) AS cameras',
    );
    console.log('Загружено:', rows[0]);
  } catch (err) {
    console.error('Ошибка инициализации БД:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
