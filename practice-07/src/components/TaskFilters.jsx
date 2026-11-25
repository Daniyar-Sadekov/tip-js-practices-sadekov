import { PRIORITY_LABELS, STATUS_OPTIONS } from './labels.js';

const EMPTY_FILTERS = Object.freeze({ q: '', completed: '', priority: '', categoryId: '' });

export default function TaskFilters({ filters, categories, onChange }) {
  // Компонент не хранит фильтры сам: значения приходят из App, изменения уходят в onChange.
  const update = (name, value) => onChange({ ...filters, [name]: value });

  return (
    <section aria-label="Фильтры">
      <h2>Фильтры</h2>

      <label htmlFor="filter-q">Поиск по названию</label>
      <input
        id="filter-q"
        type="search"
        value={filters.q}
        onChange={event => update('q', event.target.value)}
        placeholder="Фрагмент названия"
      />

      {/* Статус — группа кнопок: активная выделяется и отмечена aria-pressed. */}
      <p id="filter-status-label" className="field-label">Статус</p>
      <div className="segmented" role="group" aria-labelledby="filter-status-label">
        {STATUS_OPTIONS.map(option => {
          const isActive = filters.completed === option.value;
          return (
            <button
              key={option.value || 'all'}
              type="button"
              className={isActive ? 'is-active' : undefined}
              aria-pressed={isActive}
              onClick={() => update('completed', option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <label htmlFor="filter-priority">Приоритет</label>
      <select id="filter-priority" value={filters.priority} onChange={event => update('priority', event.target.value)}>
        <option value="">Все</option>
        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <label htmlFor="filter-category">Категория</label>
      <select id="filter-category" value={filters.categoryId} onChange={event => update('categoryId', event.target.value)}>
        <option value="">Все</option>
        {categories.map(category => (
          <option key={category.id} value={String(category.id)}>{category.name}</option>
        ))}
      </select>

      <div className="actions">
        <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS })}>Сбросить фильтры</button>
      </div>
    </section>
  );
}
