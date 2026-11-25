import { ApiError } from './errors.js';

const PRIORITIES = new Set(['low', 'medium', 'high']);
const TITLE_MAX_LENGTH = 100;
const EDITABLE_FIELDS = ['title', 'priority', 'categoryId'];

// categoryIds — Set существующих id категорий.
// Возвращает НОВЫЙ объект только с нормализованными разрешёнными полями.
// partial=false (POST): title, priority, categoryId обязательны; completed/id запрещены.
// partial=true (PATCH): хотя бы одно из title, priority, categoryId, completed; id запрещён.
// Ошибка: ApiError(400, 'VALIDATION_ERROR', сообщение, details).
export function validateTaskInput(value, { partial = false, categoryIds } = {}) {
  // Имена полей приходят от клиента: словарь без прототипа сохранит и ключ "__proto__".
  const details = Object.create(null);
  const fail = () => {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Данные не прошли проверку.', details);
  };

  // 1. Тело — обычный объект, а не массив, строка, число, boolean или null.
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    details.body = 'Тело запроса должно быть JSON-объектом.';
    fail();
  }

  // 2. Разрешённые поля: PATCH ещё может менять completed. id не принимается никогда.
  const allowed = partial ? [...EDITABLE_FIELDS, 'completed'] : EDITABLE_FIELDS;
  const keys = Object.keys(value);
  for (const key of keys) {
    if (key === 'id') details.id = 'id назначается сервером и не может быть передан.';
    else if (!allowed.includes(key)) details[key] = 'Неизвестное поле.';
  }
  if (partial && keys.length === 0) details.body = 'Нужно передать хотя бы одно изменяемое поле.';

  // 3. Проверяем поле, если оно передано; в POST отсутствие обязательного поля — ошибка.
  const result = {};
  const has = key => Object.hasOwn(value, key); // не if (value.completed) — пропустит false
  const required = key => {
    if (!partial && !has(key)) details[key] = 'Поле обязательно.';
    return has(key);
  };

  if (required('title')) {
    const title = typeof value.title === 'string' ? value.title.trim() : null;
    if (title === null || title.length < 1 || title.length > TITLE_MAX_LENGTH) {
      details.title = `Название — строка от 1 до ${TITLE_MAX_LENGTH} символов без краевых пробелов.`;
    } else {
      result.title = title;
    }
  }

  if (required('priority')) {
    if (!PRIORITIES.has(value.priority)) details.priority = 'Приоритет — low, medium или high.';
    else result.priority = value.priority;
  }

  if (required('categoryId')) {
    // Строку '2' не преобразуем: в JSON-теле число передаётся числом.
    const id = value.categoryId;
    if (!Number.isSafeInteger(id) || id <= 0 || !categoryIds.has(id)) {
      details.categoryId = 'Неизвестная категория.';
    } else {
      result.categoryId = id;
    }
  }

  if (partial && has('completed')) {
    if (typeof value.completed !== 'boolean') details.completed = 'completed — только true или false.';
    else result.completed = value.completed;
  }

  // 4. Ошибки всех полей отдаются одним ответом; хранилище при этом не трогается.
  if (Object.keys(details).length > 0) fail();
  return result;
}
