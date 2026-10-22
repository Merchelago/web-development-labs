// Маршруты REST API. Чтение доступно авторизованным пользователям, изменение справочников — администратору.
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const auth = require('../controllers/authController');
const dashboard = require('../controllers/dashboardController');
const stats = require('../controllers/statisticsController');
const violations = require('../controllers/violationsController');
const tasks = require('../controllers/tasksController');
const employees = require('../controllers/employeesController');
const facilities = require('../controllers/facilitiesController');
const cameras = require('../controllers/camerasController');
const reports = require('../controllers/reportsController');
const misc = require('../controllers/miscController');

const admin = requireRole('admin');
const router = express.Router();

// --- авторизация
router.post('/auth/login', auth.login);
router.use(requireAuth);
router.get('/auth/me', auth.me);

// --- сводка и аналитика
router.get('/dashboard', admin, dashboard.getDashboard);
router.get('/statistics', admin, stats.getStatistics);
router.get('/statistics/me', stats.getMyStatistics);
router.get('/lookups', misc.lookups);
router.get('/lookups/employees', misc.employeesShort);
router.get('/search', admin, misc.search);

// --- нарушения (события); /api/events — синоним из минимального набора API
const events = express.Router();
events.get('/', violations.list);
events.get('/:id', violations.get);
events.post('/', upload.single('photo'), violations.create);
events.patch('/:id', admin, violations.update);
events.delete('/:id', admin, violations.remove);
events.post('/:id/comments', violations.addComment);
router.use('/violations', events);
router.use('/events', events);
router.get('/violation-types', violations.types);

// --- задачи
router.get('/tasks', tasks.list);
router.get('/tasks/:id', tasks.get);
router.post('/tasks', admin, tasks.create);
router.patch('/tasks/:id', tasks.update);
router.delete('/tasks/:id', admin, tasks.remove);

// --- производственные объекты (/api/objects по спецификации; /api/facilities — синоним)
for (const base of ['/objects', '/facilities']) {
  router.get(base, facilities.list);
  router.get(`${base}/:id`, facilities.get);
  router.post(base, admin, facilities.create);
  router.put(`${base}/:id`, admin, facilities.update);
  router.delete(`${base}/:id`, admin, facilities.remove);
}

// --- сотрудники
router.get('/employees', admin, employees.list);
router.get('/employees/:id', admin, employees.get);
router.post('/employees', admin, employees.create);
router.put('/employees/:id', admin, employees.update);
router.delete('/employees/:id', admin, employees.remove);

// --- камеры и распознавание
router.get('/cameras', cameras.list);
router.get('/cameras/:id', cameras.get);
router.patch('/cameras/:id', admin, cameras.update);
router.post('/cameras/:id/snapshot', cameras.snapshot);
router.post('/ai/analyze/:cameraId', admin, misc.analyze);

// --- уведомления
router.get('/notifications', misc.notifications);
router.patch('/notifications/read-all', misc.markAllRead);
router.patch('/notifications/:id/read', misc.markRead);

// --- проверки СИЗ, обучающие материалы, отчёты
router.post('/ppe-checks', misc.createPpeCheck);
router.get('/training', misc.training);
router.get('/training/:id', misc.trainingItem);
router.get('/reports/summary', admin, reports.summary);
router.get('/reports/export', admin, reports.exportCsv);

module.exports = router;
