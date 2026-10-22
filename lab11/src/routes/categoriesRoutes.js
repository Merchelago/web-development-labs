import { Router } from 'express';
import * as categories from '../controllers/categoriesController.js';
import { asyncHandler as h } from '../utils/httpError.js';

export const categoriesRouter = Router();
categoriesRouter.get('/', h(categories.listCategories));
categoriesRouter.get('/:id', h(categories.getCategory));
categoriesRouter.post('/', h(categories.createCategory));
categoriesRouter.put('/:id', h(categories.updateCategory));
categoriesRouter.delete('/:id', h(categories.deleteCategory));

export const statusesRouter = Router();
statusesRouter.get('/', h(categories.listStatuses));
