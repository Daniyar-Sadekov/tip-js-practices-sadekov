import { useState } from 'react';
import { validateTaskDraft } from '../domain/task-service.js';
import { PRIORITY_LABELS } from './labels.js';

function createDraft(initialTask, categories) {
  if (initialTask) {
    // Значение <select> — строка, поэтому categoryId переводим в строку.
    return { title: initialTask.title, priority: initialTask.priority, categoryId: String(initialTask.categoryId) };
  }
  return { title: '', priority: 'medium', categoryId: categories.length > 0 ? String(categories[0].id) : '' };
}

export default function TaskForm({ categories, initialTask = null, onSave, onCancel }) {
  // Начальное значение useState применяется только при монтировании;
  // при смене задачи App пересоздаёт форму через key.
  const [draft, setDraft] = useState(() => createDraft(initialTask, categories));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const isEditing = initialTask !== null;
  const update = (name, value) => setDraft(previous => ({ ...previous, [name]: value }));

  const handleSubmit = event => {
    event.preventDefault();
    setMessage('');
    setSaveError('');

    const result = validateTaskDraft(draft, categories);
    setErrors(result.errors);
    if (!result.valid) return; // введённые значения остаются в форме

    if (!onSave(result.value)) {
      setSaveError('Не удалось сохранить: задача уже удалена. Отмените редактирование.');
      return;
    }
    if (!isEditing) {
      setDraft(createDraft(null, categories));
      setMessage(`Задача «${result.value.title}» создана.`);
    }
  };

  const fieldProps = name => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `task-${name}-error` : undefined,
  });

  return (
    <section aria-label="Форма задачи">
      <h2>{isEditing ? `Редактирование задачи № ${initialTask.id}` : 'Новая задача'}</h2>
      <form noValidate onSubmit={handleSubmit}>
        <label htmlFor="task-title">Название</label>
        <input id="task-title" type="text" value={draft.title} onChange={event => update('title', event.target.value)} {...fieldProps('title')} />
        {errors.title && <p id="task-title-error" className="error">{errors.title}</p>}

        <label htmlFor="task-priority">Приоритет</label>
        <select id="task-priority" value={draft.priority} onChange={event => update('priority', event.target.value)} {...fieldProps('priority')}>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors.priority && <p id="task-priority-error" className="error">{errors.priority}</p>}

        <label htmlFor="task-category">Категория</label>
        <select id="task-category" value={draft.categoryId} onChange={event => update('categoryId', event.target.value)} {...fieldProps('categoryId')}>
          {categories.map(category => (
            <option key={category.id} value={String(category.id)}>{category.name}</option>
          ))}
        </select>
        {errors.categoryId && <p id="task-categoryId-error" className="error">{errors.categoryId}</p>}

        <div className="actions">
          <button type="submit">{isEditing ? 'Сохранить' : 'Создать'}</button>
          {isEditing && <button type="button" onClick={onCancel}>Отмена</button>}
        </div>
      </form>
      <p role="status">{message}</p>
      {saveError && <p role="alert">{saveError}</p>}
    </section>
  );
}
