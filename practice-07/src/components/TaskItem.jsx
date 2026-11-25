import { PRIORITY_LABELS } from './labels.js';

export default function TaskItem({ task, categoryName, onToggle, onEdit, onDelete }) {
  // Карточка не копирует задачу в своё состояние — всегда показывает актуальные props.
  return (
    <li className={task.completed ? 'task is-done' : 'task'}>
      <p className="task-title">{task.title}</p>
      <p className="task-meta">
        <span>{task.completed ? 'Выполнена' : 'В работе'}</span>
        <span>{PRIORITY_LABELS[task.priority]}</span>
        <span>{categoryName}</span>
      </p>
      <div className="actions">
        <button type="button" onClick={() => onToggle(task.id)}>
          {task.completed ? 'Вернуть в работу' : 'Выполнена'}
        </button>
        <button type="button" onClick={() => onEdit(task.id)}>Редактировать</button>
        <button type="button" className="danger" onClick={() => onDelete(task.id)}>Удалить</button>
      </div>
    </li>
  );
}
