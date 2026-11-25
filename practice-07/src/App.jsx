import { useState } from 'react';
import { tasks as initialTasks, categories } from './data.js';
import { createInitialFilters } from './variant.js';
import { addTask, getTaskStats, removeTask, selectTasks, toggleTask, updateTask } from './domain/task-service.js';
import TaskForm from './components/TaskForm.jsx';
import TaskFilters from './components/TaskFilters.jsx';
import TaskList from './components/TaskList.jsx';
import TaskStats from './components/TaskStats.jsx';

// Следующий локальный id — максимум ПОЛНОГО массива + 1 (не длина и не видимая выборка).
const nextId = tasks => tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;

export default function App() {
  // Владелец общего состояния: задачи, фильтры и id редактируемой задачи.
  const [tasks, setTasks] = useState(() => initialTasks.map(task => ({ ...task })));
  const [filters, setFilters] = useState(createInitialFilters);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');

  // Производные данные считаются на каждом рендере, отдельного состояния у них нет.
  const visibleTasks = selectTasks(tasks, filters);
  const stats = getTaskStats(tasks);
  const editingTask = tasks.find(task => task.id === editingId) ?? null;

  const handleToggle = id => {
    setTasks(previous => toggleTask(previous, id));
    setNotice(`Статус задачи № ${id} изменён.`);
  };

  const handleEdit = id => setEditingId(id);

  const handleDelete = id => {
    // Подтверждение — до обновления состояния: функция обновления должна быть чистой.
    if (!window.confirm('Удалить задачу?')) return;
    setTasks(previous => removeTask(previous, id));
    if (editingId === id) setEditingId(null);
    setNotice(`Задача № ${id} удалена.`);
  };

  const handleSave = value => {
    if (editingId === null) {
      setTasks(previous => addTask(previous, value, nextId(previous)));
      setNotice('');
      return true;
    }
    if (editingTask === null) return false; // редактируемую задачу уже удалили
    setTasks(previous => updateTask(previous, editingId, value));
    setEditingId(null);
    setNotice(`Задача № ${editingId} изменена.`);
    return true;
  };

  return (
    <main>
      <h1>Задачи на React</h1>
      <p>ПР7: данные в памяти. Обновление страницы восстанавливает исходный набор.</p>
      <p role="status">{notice}</p>

      <TaskStats stats={stats} />
      <TaskFilters filters={filters} categories={categories} onChange={setFilters} />
      <TaskForm
        key={editingId ?? 'new'}
        categories={categories}
        initialTask={editingTask}
        onSave={handleSave}
        onCancel={() => setEditingId(null)}
      />
      <TaskList
        tasks={visibleTasks}
        categories={categories}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyHint={tasks.length > 0 ? 'Под выбранные фильтры ничего не подходит — сбросьте фильтры.' : ''}
      />
    </main>
  );
}
