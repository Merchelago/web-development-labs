import { Router } from 'express';
import * as tasks from '../controllers/tasksController.js';
import { asyncHandler as h } from '../utils/httpError.js';

const router = Router();

router.get('/', h(tasks.listTasks));
router.get('/stats', h(tasks.getStats)); // объявлен до /:id, иначе «stats» будет принято за id
router.get('/:id', h(tasks.getTask));
router.post('/', h(tasks.createTask));
router.put('/:id', h(tasks.replaceTask));
router.patch('/:id', h(tasks.patchTask));
router.patch('/:id/status', h(tasks.setStatus));
router.delete('/:id', h(tasks.deleteTask));

export default router;
