import { demoTasks, variantTasks, variantNumber } from "./data.js";
import { findTaskById, setTaskCompleted, removeTask } from "./task-service.js";
import { getVisibleTasks } from "./task-selectors.js";
import { renderTaskList, renderSummary, renderEmptyState } from "./task-view.js";

// ═══════════════════════════════════════════════════════
//  App — состояние интерфейса (currentTasks/currentFilter)
//  и обработчики событий. Обёртки над DOM — в task-view.js,
//  прикладная логика — в task-service.js/task-selectors.js.
// ═══════════════════════════════════════════════════════
class App {
    constructor(elements, initialTasks) {
        this.elements = elements;
        this.currentTasks = initialTasks.map((task) => ({ ...task }));
        this.currentFilter = "all";
    }

    /** Перерисовывает список, сводку, пустое состояние и активный фильтр. */
    renderApp() {
        const visible = getVisibleTasks(this.currentTasks, this.currentFilter);

        renderTaskList(this.elements.list, visible);
        renderSummary(this.elements.summary, this.currentTasks, visible.length);
        renderEmptyState(this.elements.empty, this.currentTasks.length, visible.length);

        for (const button of this.elements.filters.querySelectorAll("button[data-filter]")) {
            const isActive = button.dataset.filter === this.currentFilter;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        }
    }

    showMessage(text) {
        this.elements.message.textContent = text;
    }

    /** Делегированный обработчик клика по списку задач (toggle/delete). */
    handleTaskListClick = (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button || !this.elements.list.contains(button)) return;

        const card = button.closest("[data-task-id]");
        if (!card) return;

        const actionType = button.dataset.action;
        if (actionType !== "toggle" && actionType !== "delete") return;

        const id = Number(card.dataset.taskId);
        if (!Number.isInteger(id)) {
            this.showMessage("Некорректный идентификатор задачи");
            return;
        }

        let result;
        if (actionType === "toggle") {
            const task = findTaskById(this.currentTasks, id);
            if (task === undefined) {
                this.showMessage(`Задача с id = ${id} не найдена`);
                return;
            }
            result = setTaskCompleted(this.currentTasks, id, !task.completed);
        } else {
            result = removeTask(this.currentTasks, id);
        }

        if (!result.ok) {
            this.showMessage(`Ошибка: ${result.error}`);
            return;
        }

        this.currentTasks = result.tasks;
        this.showMessage("");
        this.renderApp();
        this.restoreTaskFocus(id, actionType);
    };

    /** Делегированный обработчик клика по кнопкам фильтра. */
    handleFilterClick = (event) => {
        const button = event.target.closest("button[data-filter]");
        if (!button || !this.elements.filters.contains(button)) return;

        const mode = button.dataset.filter;
        if (mode !== "all" && mode !== "pending" && mode !== "completed") return;

        this.currentFilter = mode;
        this.showMessage("");
        this.renderApp();
    };

    // Готовая вспомогательная функция (из заготовки методички).
    // Сохраняет понятную позицию клавиатурного фокуса после замены карточек.
    // Если карточки больше нет, фокус получает активный фильтр.
    restoreTaskFocus(id, action) {
        const actionButton = this.elements.list.querySelector(
            `[data-task-id="${id}"] button[data-action="${action}"]`,
        );
        const filterButton = this.elements.filters.querySelector(`[data-filter="${this.currentFilter}"]`);
        (actionButton ?? filterButton)?.focus();
    }
}

const elements = {
    list: document.querySelector("#task-list"),
    filters: document.querySelector("#task-filters"),
    summary: document.querySelector("#task-summary"),
    empty: document.querySelector("#empty-message"),
    message: document.querySelector("#operation-message"),
    datasetLabel: document.querySelector("#dataset-label"),
};

// Готовая служебная часть: ?dataset=variant включает данные своего варианта.
const isVariant = new URLSearchParams(window.location.search).get("dataset") === "variant";
const initialTasks = isVariant ? variantTasks : demoTasks;

elements.datasetLabel.textContent = isVariant
    ? `Индивидуальный вариант: ${variantNumber ?? "не указан"}`
    : "Общий контрольный набор";

const app = new App(elements, initialTasks);

// Подписки выполняются один раз. Эти контейнеры не заменяются при перерисовке.
elements.list.addEventListener("click", app.handleTaskListClick);
elements.filters.addEventListener("click", app.handleFilterClick);

try {
    app.renderApp();
} catch (error) {
    elements.message.textContent = `Ошибка запуска: ${error.message}`;
    console.error(error);
}
