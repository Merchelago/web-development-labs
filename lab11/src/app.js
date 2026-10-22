import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { query } from './db/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { categoriesRouter, statusesRouter } from './routes/categoriesRoutes.js';
import tasksRouter from './routes/tasksRoutes.js';
import { asyncHandler } from './utils/httpError.js';

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

// журнал запросов: метод, адрес, статус, время обработки
if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
        const started = Date.now();
        res.on('finish', () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - started} мс)`));
        next();
    });
}

// проверка работоспособности сервера и соединения с БД
app.get('/api/health', asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT current_database() AS database, now() AS time');
    res.json({ status: 'ok', ...rows[0] });
}));

app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/statuses', statusesRouter);

app.use(notFoundHandler);
app.use(errorHandler);
