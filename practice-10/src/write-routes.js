import { ApiError } from './errors.js';
import { jsonBody } from './json-body.js';
import { requireTask } from './task-resource.js';
import { validateTaskInput } from './task-validation.js';

const categoryIdsOf = store => new Set(store.listCategories().map(category => category.id));
const taskNotFound = id => new ApiError(404, 'TASK_NOT_FOUND', 'Задача не найдена.', { id });

export function registerWriteRoutes(router, store) {
  // Порядок: разбор тела (jsonBody) → проверка всех полей → изменение хранилища → ответ.
  router.post('/tasks', ...jsonBody, (req, res) => {
    // При ошибке validateTaskInput бросает ApiError 400 — до createTask дело не доходит.
    const value = validateTaskInput(req.body, { categoryIds: categoryIdsOf(store) });
    const task = store.createTask(value);
    res.status(201).location(`/api/tasks/${task.id}`).json({ data: task });
  });

  // requireTask стоит раньше jsonBody: неверный id → 400, отсутствующий → 404, ещё до разбора тела.
  router.patch('/tasks/:id', requireTask(store), ...jsonBody, (req, res) => {
    const changes = validateTaskInput(req.body, { partial: true, categoryIds: categoryIdsOf(store) });
    const task = store.updateTask(req.task.id, changes);
    if (task === null) throw taskNotFound(req.task.id); // запись могли удалить, пока читали тело
    res.json({ data: task });
  });

  router.delete('/tasks/:id', requireTask(store), (req, res) => {
    if (!store.deleteTask(req.task.id)) throw taskNotFound(req.task.id);
    res.status(204).end(); // 204 — без тела
  });
}
