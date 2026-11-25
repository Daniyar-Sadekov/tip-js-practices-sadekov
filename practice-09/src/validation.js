import { ApiError } from './errors.js';

const ALLOWED_FILTERS = ['completed', 'priority', 'categoryId', 'q'];
const PRIORITIES = new Set(['low', 'medium', 'high']);
const Q_MAX_LENGTH = 100;
const POSITIVE_INTEGER = /^[1-9]\d*$/; // без нулей в начале, знаков, точек и экспоненты

// raw: строка; результат: безопасное положительное целое либо null.
// parseInt не подходит: parseInt('4abc') === 4.
export function parsePositiveId(raw) {
  if (typeof raw !== 'string' || !POSITIVE_INTEGER.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

const invalidQuery = message => new ApiError(400, 'INVALID_QUERY', message);

// URLSearchParams -> { completed: boolean|null, priority: string|null,
// categoryId: number|null, q: string }. Ошибка: ApiError(400, 'INVALID_QUERY', ...).
export function parseFilters(searchParams) {
  // 1. Только известные имена (с учётом регистра).
  for (const name of searchParams.keys()) {
    if (!ALLOWED_FILTERS.includes(name)) throw invalidQuery(`Неизвестный параметр запроса: ${name}.`);
  }
  // 2. Каждое имя — не больше одного раза, даже с одинаковыми значениями.
  for (const name of ALLOWED_FILTERS) {
    if (searchParams.getAll(name).length > 1) throw invalidQuery(`Параметр ${name} указан несколько раз.`);
  }

  // 3. Проверка и преобразование значений. null — «параметра нет, фильтр не применяется».
  const filters = { completed: null, priority: null, categoryId: null, q: '' };

  if (searchParams.has('completed')) {
    const raw = searchParams.get('completed');
    // Boolean('false') === true, поэтому сравниваем строки явно.
    if (raw !== 'true' && raw !== 'false') throw invalidQuery('completed — строго true или false.');
    filters.completed = raw === 'true';
  }

  if (searchParams.has('priority')) {
    const raw = searchParams.get('priority');
    if (!PRIORITIES.has(raw)) throw invalidQuery('priority — low, medium или high.');
    filters.priority = raw;
  }

  if (searchParams.has('categoryId')) {
    const id = parsePositiveId(searchParams.get('categoryId'));
    if (id === null) throw invalidQuery('categoryId — положительное целое число без ведущих нулей.');
    filters.categoryId = id;
  }

  if (searchParams.has('q')) {
    const q = searchParams.get('q').trim();
    if (q.length > Q_MAX_LENGTH) throw invalidQuery(`q — не длиннее ${Q_MAX_LENGTH} символов.`);
    filters.q = q;
  }

  // 4. Всегда новый объект со всеми четырьмя полями.
  return filters;
}
