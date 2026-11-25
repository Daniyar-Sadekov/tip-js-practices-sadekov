import TaskItem from './TaskItem.jsx';

export default function TaskList({ tasks, categories, onToggle, onEdit, onDelete, emptyHint = '' }) {
  const categoryName = id => categories.find(category => category.id === id)?.name ?? 'Без категории';

  return (
    <section aria-label="Список задач">
      <h2>Задачи</h2>
      <p>Найдено: {tasks.length}</p>

      {/* Условный рендеринг: пустой массив — заглушка, иначе список карточек. */}
      {tasks.length === 0 ? (
        <div className="empty">
          <p>Список задач пуст</p>
          {emptyHint && <p className="hint">{emptyHint}</p>}
        </div>
      ) : (
        <ul>
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              categoryName={categoryName(task.categoryId)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
