import { getTaskStats } from "./task-service.js";

// Словарь отображаемых подписей приоритета — единственное место,
// где текстовые названия связаны со значениями модели.
const PRIORITY_LABELS = { low: "Низкий", medium: "Средний", high: "Высокий" };

// ═══════════════════════════════════════════════════════
//  TaskView — создание и обновление DOM. Состояние приложения
//  здесь не хранится и не меняется — только чтение переданных
//  данных и запись в разметку.
// ═══════════════════════════════════════════════════════
class TaskView {
    /** Строит li.task-card для одной задачи. Обработчики не назначаются. */
    static createTaskElement(task) {
        const item = document.createElement("li");
        item.className = "task-card";
        item.classList.toggle("is-completed", task.completed === true);
        item.dataset.taskId = String(task.id);

        const title = document.createElement("p");
        title.className = "task-title";
        title.textContent = task.title;

        const status = document.createElement("p");
        status.className = "task-status";
        status.textContent = task.completed ? "Выполнена" : "В работе";

        const priority = document.createElement("p");
        priority.className = "task-priority";
        priority.textContent = PRIORITY_LABELS[task.priority] ?? task.priority;

        const toggleButton = TaskView._createActionButton("toggle", "Выполнена", task.completed === true);
        const deleteButton = TaskView._createActionButton("delete", "Удалить");

        item.append(title, status, priority, toggleButton, deleteButton);
        return item;
    }

    /** @param {boolean} [pressed] — только для кнопки toggle (aria-pressed). */
    static _createActionButton(action, label, pressed) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = action;
        if (pressed !== undefined) {
            button.setAttribute("aria-pressed", String(pressed));
        }

        const span = document.createElement("span");
        span.className = "action-label";
        span.textContent = label;

        button.append(span);
        return button;
    }

    /** Заменяет дочерние карточки; сам listElement (и его обработчик) сохраняется. */
    static renderTaskList(listElement, tasks) {
        const cards = tasks.map((task) => TaskView.createTaskElement(task));
        listElement.replaceChildren(...cards);
    }

    /** tasks — весь текущий список, visibleCount — длина отфильтрованного результата. */
    static renderSummary(summaryElement, tasks, visibleCount) {
        const { total, completed, pending, progress } = getTaskStats(tasks);
        const values = {
            total,
            completed,
            pending,
            progress: `${progress.toFixed(1)}%`,
            visible: visibleCount,
        };
        for (const [name, value] of Object.entries(values)) {
            const node = summaryElement.querySelector(`[data-stat="${name}"]`);
            if (node) node.textContent = String(value);
        }
    }

    /** Различает пустой общий список и пустой результат фильтра. */
    static renderEmptyState(messageElement, total, visibleCount) {
        if (total === 0) {
            messageElement.hidden = false;
            messageElement.textContent = "Список задач пуст.";
            return;
        }
        if (visibleCount === 0) {
            messageElement.hidden = false;
            messageElement.textContent = "Нет задач по выбранному фильтру.";
            return;
        }
        messageElement.hidden = true;
        messageElement.textContent = "";
    }
}

export function createTaskElement(task) {
    return TaskView.createTaskElement(task);
}

export function renderTaskList(listElement, tasks) {
    return TaskView.renderTaskList(listElement, tasks);
}

export function renderSummary(summaryElement, tasks, visibleCount) {
    return TaskView.renderSummary(summaryElement, tasks, visibleCount);
}

export function renderEmptyState(messageElement, total, visibleCount) {
    return TaskView.renderEmptyState(messageElement, total, visibleCount);
}

export { TaskView };
