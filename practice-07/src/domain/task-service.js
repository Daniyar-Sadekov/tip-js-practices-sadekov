// Чистые функции: без React, DOM, сети, случайных значений и изменения аргументов.
// Точные контракты и допустимые входы приведены в методичке.

const PRIORITIES = new Set(['low', 'medium', 'high']);
const TITLE_MAX_LENGTH = 100;

const isPositiveInteger = value => Number.isSafeInteger(value) && value > 0;

// Категория из <select> приходит строкой. Number('2x') даёт NaN, а parseInt('2x') — 2,
// поэтому используем Number и отдельно отсекаем пустую строку (Number('') === 0).
function parseCategoryId(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string' || raw.trim() === '') return NaN;
  return Number(raw);
}

export function validateTaskDraft(draft, categories) {
  const errors = {};

  const title = typeof draft?.title === 'string' ? draft.title.trim() : null;
  if (title === null) {
    errors.title = 'Название должно быть строкой';
  } else if (title.length < 1 || title.length > TITLE_MAX_LENGTH) {
    errors.title = `Название — от 1 до ${TITLE_MAX_LENGTH} символов без краевых пробелов`;
  }

  const priority = draft?.priority;
  if (!PRIORITIES.has(priority)) {
    errors.priority = 'Выберите приоритет: низкий, средний или высокий';
  }

  const categoryId = parseCategoryId(draft?.categoryId);
  if (!isPositiveInteger(categoryId) || !categories.some(category => category.id === categoryId)) {
    errors.categoryId = 'Выберите существующую категорию';
  }

  const valid = Object.keys(errors).length === 0;
  return { valid, value: { title, priority, categoryId }, errors };
}

export function selectTasks(tasks, filters) {
  const q = filters.q.trim().toLowerCase();
  // Boolean('false') === true, поэтому статус сравниваем со строками явно.
  const completed = filters.completed === '' ? null : filters.completed === 'true';
  const categoryId = filters.categoryId === '' ? null : Number(filters.categoryId);

  return tasks.filter(task =>
    (q === '' || task.title.toLowerCase().includes(q)) &&
    (completed === null || task.completed === completed) &&
    (filters.priority === '' || task.priority === filters.priority) &&
    (categoryId === null || task.categoryId === categoryId)
  );
}

export function getTaskStats(tasks) {
  const completed = tasks.filter(task => task.completed).length;
  return { total: tasks.length, completed, active: tasks.length - completed };
}

export function addTask(tasks, value, id) {
  if (!isPositiveInteger(id)) {
    throw new TypeError('id задачи — положительное целое число');
  }
  if (tasks.some(task => task.id === id)) {
    throw new Error(`Задача с id = ${id} уже существует`);
  }
  const { title, priority, categoryId } = value;
  return [...tasks, { id, title, priority, categoryId, completed: false }];
}

export function updateTask(tasks, id, value) {
  if (!tasks.some(task => task.id === id)) return tasks;
  const { title, priority, categoryId } = value;
  // Новый объект только у найденной задачи; id и completed сохраняются.
  return tasks.map(task => (task.id === id ? { ...task, title, priority, categoryId } : task));
}

export function toggleTask(tasks, id) {
  if (!tasks.some(task => task.id === id)) return tasks;
  return tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task));
}

export function removeTask(tasks, id) {
  if (!tasks.some(task => task.id === id)) return tasks;
  return tasks.filter(task => task.id !== id);
}
