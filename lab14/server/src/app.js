const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler, notFoundRoute } = require('./middleware/errorHandler');
const { UPLOAD_DIR } = require('./middleware/upload');
const { query } = require('./db/pool');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));

// Журнал запросов к API в консоли
app.use('/api', (req, res, next) => {
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t} мс)`));
  next();
});

// Статические файлы: демонстрационные кадры и загруженные фотографии
app.use('/media', express.static(path.join(__dirname, '..', 'public', 'media'), { maxAge: '1h' }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unavailable' });
  }
});

app.use('/api', routes);
app.use('/api', notFoundRoute);
app.use(errorHandler);

module.exports = app;
