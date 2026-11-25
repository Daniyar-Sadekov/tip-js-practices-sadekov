const normalize = text => text.toLocaleLowerCase('ru-RU');

// Все фильтры объединяются через И. Исходный массив не изменяется.
// null в фильтре означает «без ограничения» — поэтому сравниваем с null, а не через if (filters.completed).
export function selectTasks(tasks, filters) {
  const q = normalize(filters.q);
  return tasks.filter(task =>
    (filters.completed === null || task.completed === filters.completed) &&
    (filters.priority === null || task.priority === filters.priority) &&
    (filters.categoryId === null || task.categoryId === filters.categoryId) &&
    (q === '' || normalize(task.title).includes(q))
  );
}

// Поиск по полю id, не по индексу. Возвращает задачу или null.
export function findTask(tasks, id) {
  return tasks.find(task => task.id === id) ?? null;
}
