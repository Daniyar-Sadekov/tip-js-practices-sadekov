import { categories as seedCategories, tasks as seedTasks } from './data.js';
import { selectTasks, findTask } from './task-service.js';
const noFilters = { completed: null, priority: null, categoryId: null, q: '' };

export function createStore() {
  let tasks;
  let nextId;
  const categories = seedCategories.map(item => ({ ...item }));
  function reset() {
    tasks = seedTasks.map(item => ({ ...item }));
    nextId = Math.max(0, ...tasks.map(item => item.id)) + 1;
    return { reset: true, total: tasks.length };
  }
  reset();
  return {
    listTasks: (filters = noFilters) => selectTasks(tasks, filters).map(item => ({ ...item })),
    getTask: id => { const task = findTask(tasks, id); return task ? { ...task } : null; },
    listCategories: () => categories.map(item => ({ ...item })),
    reset,
    createTask(value) {
      // value уже проверен. Поля новой записи собираем явно; id — из счётчика, не из length.
      const task = { id: nextId, title: value.title, completed: false, priority: value.priority, categoryId: value.categoryId };
      tasks = [...tasks, task];
      nextId += 1;
      return { ...task };
    },
    updateTask(id, changes) {
      const current = findTask(tasks, id);
      if (!current) return null;
      // Непереданные поля сохраняются; id задаём последним, чтобы его нельзя было подменить.
      const updated = { ...current, ...changes, id: current.id };
      tasks = tasks.map(task => (task.id === id ? updated : task));
      return { ...updated };
    },
    deleteTask(id) {
      if (!findTask(tasks, id)) return false;
      tasks = tasks.filter(task => task.id !== id); // nextId не уменьшается
      return true;
    },
  };
}
