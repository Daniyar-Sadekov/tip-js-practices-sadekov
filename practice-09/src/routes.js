import { Router } from 'express';
import { ApiError } from './errors.js';
import { parseFilters, parsePositiveId } from './validation.js';

const READ_METHODS = 'GET, HEAD, OPTIONS';

export function createRouter(store) {
  const router = Router({ caseSensitive: true });
  router.get('/health', (req, res) => res.json({ data: { status: 'ok' } }));

  router.get('/categories', (req, res) => {
    const data = store.listCategories();
    res.json({ data, meta: { total: data.length } });
  });

  router.get('/tasks', (req, res) => {
    // Разбираем исходный URL: getAll() позволяет обнаружить повторяющиеся параметры.
    const { searchParams } = new URL(req.originalUrl, 'http://localhost');
    const filters = parseFilters(searchParams); // неверный query → ApiError 400 → errorHandler
    const data = store.listTasks(filters);
    res.json({ data, meta: { total: data.length, filters } });
  });

  router.get('/tasks/:id', (req, res) => {
    const id = parsePositiveId(req.params.id);
    if (id === null) {
      throw new ApiError(400, 'INVALID_ID', 'id задачи — положительное целое число.');
    }
    const task = store.getTask(id);
    if (task === null) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id });
    }
    res.json({ data: task });
  });

  // Регистрируются ПОСЛЕ GET: иначе router.all перехватил бы и чтение.
  // OPTIONS отвечает приложение раньше, HEAD обслуживают GET-маршруты.
  router.all(['/health', '/categories', '/tasks', '/tasks/:id'], (req, res, next) => {
    res.set('Allow', READ_METHODS);
    next(new ApiError(405, 'METHOD_NOT_ALLOWED', `Метод ${req.method} не поддерживается. Разрешены: ${READ_METHODS}.`));
  });

  return router;
}
