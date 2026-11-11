const PRIORITY_LABELS = Object.freeze({
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
});

// ═══════════════════════════════════════════════════════
//  TaskView — построение карточек (перенесено из ПР4 и
//  дополнено категорией). Только чтение данных и запись
//  в разметку; пользовательские строки — через textContent.
// ═══════════════════════════════════════════════════════
class TaskView {
    static createTaskElement(task, category) {
        const item = document.createElement("li");
        item.className = "task-card";
        item.classList.toggle("is-completed", task.completed === true);
        item.dataset.taskId = String(task.id);

        const title = document.createElement("h3");
        title.className = "task-title";
        title.textContent = task.title;

        const meta = document.createElement("p");
        meta.className = "task-meta";

        const status = TaskView._createMetaItem("task-status", task.completed ? "Выполнена" : "В работе");
        const priority = TaskView._createMetaItem("task-priority", PRIORITY_LABELS[task.priority] ?? task.priority);
        const categoryName = TaskView._createMetaItem("task-category", category?.name ?? "Без категории");
        meta.append(status, priority, categoryName);

        const actions = document.createElement("div");
        actions.className = "task-actions";
        actions.append(
            TaskView._createActionButton("toggle", task.completed ? "Вернуть в работу" : "Выполнена", task.completed === true),
            TaskView._createActionButton("edit", "Изменить"),
            TaskView._createActionButton("delete", "Удалить"),
        );

        item.append(title, meta, actions);
        return item;
    }

    static _createMetaItem(className, text) {
        const node = document.createElement("span");
        node.className = className;
        node.textContent = text;
        return node;
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

    /** categoryId → категория через Map; список заменяется целиком, без накопления. */
    static renderTaskList(list, tasks, categories = []) {
        const byId = new Map(categories.map((category) => [category.id, category]));
        const cards = tasks.map((task) => TaskView.createTaskElement(task, byId.get(task.categoryId)));
        list.replaceChildren(...cards);
    }
}

export function createTaskElement(task, category) {
    return TaskView.createTaskElement(task, category);
}

export function renderTaskList(list, tasks, categories) {
    return TaskView.renderTaskList(list, tasks, categories);
}

export { TaskView };
