import { demoTasks, variantTasks, variantNumber } from "./data.js";
import {
    addTask,
    findTaskById,
    removeTask,
    setTaskCompleted,
    updateTask,
} from "./task-service.js";
import { getVisibleTasks } from "./task-selectors.js";
import { renderEmptyState, renderSummary, renderTaskList } from "./task-view.js";
import { validateTaskDraft } from "./form-validation.js";
import { loadTasks, removeSavedTasks, saveTasks } from "./task-storage.js";

// ═══════════════════════════════════════════════════════
//  App — состояние интерфейса (currentTasks / currentFilter /
//  editingId) и обработчики событий. Правила модели — в
//  task-service.js, проверка формы — в form-validation.js,
//  JSON и localStorage — в task-storage.js.
// ═══════════════════════════════════════════════════════
class App {
    constructor(elements, { initialTasks, storage, storageKey }) {
        this.elements = elements;
        this.initialTasks = initialTasks;
        this.storage = storage;
        this.storageKey = storageKey;

        this.currentTasks = [];
        this.currentFilter = "all";
        // null — режим создания; число — id редактируемой задачи.
        // Режим — часть интерфейса, а не модели: в storage не попадает.
        this.editingId = null;
    }

    // ── Начальная загрузка ───────────────────────────────

    /** Готовая граница запуска: ошибка модуля хранения не оставит страницу пустой. */
    load() {
        let loaded;
        try {
            loaded = loadTasks(this.storage, this.storageKey, this.initialTasks);
        } catch (error) {
            loaded = {
                ok: false,
                source: "fallback",
                tasks: this.initialTasks.map((task) => ({ ...task })),
                error: `Хранилище не инициализировано: ${error.message}`,
            };
            console.error(error);
        }
        this.currentTasks = loaded.tasks;

        const status = this.elements.storageStatus;
        if (loaded.source === "storage") {
            status.textContent = "Данные восстановлены из localStorage.";
        } else if (loaded.ok) {
            status.textContent = "Используется исходный набор; сохранённых данных пока нет.";
        } else {
            status.textContent = loaded.error;
            status.classList.add("is-warning");
        }
    }

    // ── Отрисовка ────────────────────────────────────────

    /** Перерисовывает список, сводку, пустое состояние и фильтр. storage не трогает. */
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

    // ── Ошибки полей (готовые функции заготовки) ─────────

    clearFieldError(name) {
        const { form } = this.elements;
        const input = form.elements.namedItem(name);
        const message = form.querySelector(`[data-error-for="${name}"]`);
        if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
            input.setCustomValidity("");
            input.removeAttribute("aria-invalid");
        }
        if (message) message.textContent = "";
    }

    clearFormErrors() {
        for (const name of ["id", "title", "priority"]) this.clearFieldError(name);
        this.elements.formMessage.textContent = "";
    }

    showFormErrors(errors) {
        const { form } = this.elements;
        this.clearFormErrors();
        for (const [name, text] of Object.entries(errors)) {
            const input = form.elements.namedItem(name);
            const message = form.querySelector(`[data-error-for="${name}"]`);
            if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
                input.setCustomValidity(text);
                input.setAttribute("aria-invalid", "true");
            }
            if (message) message.textContent = text;
        }
        form.reportValidity();
    }

    // ── Режимы формы ─────────────────────────────────────

    /**
     * null — режим создания; id существующей задачи — режим редактирования.
     * @returns {boolean} удалось ли переключить режим.
     */
    setFormMode(id = null) {
        const el = this.elements;

        if (id === null) {
            this.editingId = null;
            el.form.reset();
            this.clearFormErrors();
            el.idInput.disabled = false;
            el.formHeading.textContent = "Добавление задачи";
            el.formMode.textContent = "Режим создания новой задачи.";
            el.submitButton.textContent = "Добавить задачу";
            el.cancelButton.hidden = true;
            el.idInput.focus();
            return true;
        }

        // Берём актуальную запись из currentTasks, а не из DOM карточки.
        const task = findTaskById(this.currentTasks, id);
        if (task === undefined) {
            this.showMessage(`Задача с id = ${id} не найдена`);
            return false;
        }

        this.editingId = task.id;
        this.clearFormErrors();
        el.idInput.value = String(task.id);
        el.titleInput.value = task.title;
        el.priorityInput.value = task.priority;
        // disabled-поле не попадает в FormData — id потом берётся из editingId.
        el.idInput.disabled = true;
        el.formHeading.textContent = "Редактирование задачи";
        el.formMode.textContent = `Редактируется задача id = ${task.id}.`;
        el.submitButton.textContent = "Сохранить изменения";
        el.cancelButton.hidden = false;
        el.titleInput.focus();
        return true;
    }

    // ── Сохранение ───────────────────────────────────────

    /**
     * Пишет currentTasks в storage и перерисовывает интерфейс.
     * Неудачная запись не откатывает операцию — изменение остаётся
     * в памяти вкладки, пользователь получает предупреждение.
     */
    persistCurrentTasks(successMessage) {
        const saved = saveTasks(this.storage, this.storageKey, this.currentTasks);
        const status = this.elements.storageStatus;
        status.classList.toggle("is-warning", !saved.ok);
        status.textContent = saved.ok ? "Изменения сохранены в localStorage." : saved.error;
        this.showMessage(saved.ok ? successMessage : `${successMessage} ${saved.error}`);
        this.renderApp();
        return saved;
    }

    // Готовая вспомогательная функция из логики ПР3. После полной перерисовки
    // возвращает фокус на действие той же задачи либо на активный фильтр.
    restoreTaskFocus(id, action) {
        const actionButton = this.elements.list.querySelector(
            `[data-task-id="${id}"] button[data-action="${action}"]`,
        );
        const filterButton = this.elements.filters.querySelector(`[data-filter="${this.currentFilter}"]`);
        (actionButton ?? filterButton)?.focus();
    }

    // ── Обработчики ──────────────────────────────────────

    /** submit формы: Enter и клик по кнопке приходят сюда одинаково. */
    handleFormSubmit = (event) => {
        event.preventDefault();

        const formData = new FormData(this.elements.form);
        const draft = {
            id: formData.get("id"), // null в режиме редактирования (поле disabled)
            title: formData.get("title"),
            priority: formData.get("priority"),
        };

        const checked = validateTaskDraft(draft, this.currentTasks, this.editingId);
        if (!checked.ok) {
            this.showFormErrors(checked.errors);
            return;
        }

        const { id, title, priority } = checked.value;
        const isEditing = this.editingId !== null;

        // Сервис проверяет данные ещё раз: валидация формы — это
        // обратная связь, а не замена защиты прикладной операции.
        const result = isEditing
            ? updateTask(this.currentTasks, id, title, priority)
            : addTask(this.currentTasks, id, title, priority);

        if (!result.ok) {
            this.elements.formMessage.textContent = `Ошибка: ${result.error}`;
            return;
        }

        this.currentTasks = result.tasks;
        this.setFormMode(null);
        this.persistCurrentTasks(isEditing ? `Задача ${id} изменена.` : `Задача ${id} добавлена.`);
    };

    /** Делегированный обработчик клика по списку задач (toggle/edit/delete). */
    handleTaskListClick = (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button || !this.elements.list.contains(button)) return;

        const card = button.closest("[data-task-id]");
        if (!card) return;

        const actionType = button.dataset.action;
        if (actionType !== "toggle" && actionType !== "edit" && actionType !== "delete") return;

        const id = Number(card.dataset.taskId);
        if (!Number.isInteger(id)) {
            this.showMessage("Некорректный идентификатор задачи");
            return;
        }

        // edit только переключает форму — модель не меняется, storage не пишется.
        if (actionType === "edit") {
            if (this.setFormMode(id)) this.showMessage("");
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

        // Удалили задачу, которая сейчас в форме — форма возвращается к созданию.
        if (actionType === "delete" && this.editingId === id) {
            this.setFormMode(null);
        }

        this.persistCurrentTasks(actionType === "toggle"
            ? `Статус задачи ${id} изменён.`
            : `Задача ${id} удалена.`);
        this.restoreTaskFocus(id, actionType);
    };

    /** Фильтр — режим отображения, а не данные: в storage не пишется. */
    handleFilterClick = (event) => {
        const button = event.target.closest("button[data-filter]");
        if (!button || !this.elements.filters.contains(button)) return;

        const mode = button.dataset.filter;
        if (mode !== "all" && mode !== "pending" && mode !== "completed") return;

        this.currentFilter = mode;
        this.showMessage("");
        this.renderApp();
    };

    /**
     * Удаляет только свой storageKey и возвращает исходный набор.
     * Исходный набор обратно сразу не сохраняется — ключ должен остаться пустым.
     */
    handleResetClick = () => {
        const removed = removeSavedTasks(this.storage, this.storageKey);
        const status = this.elements.storageStatus;

        this.currentTasks = this.initialTasks.map((task) => ({ ...task }));
        this.currentFilter = "all";
        this.setFormMode(null);

        status.classList.toggle("is-warning", !removed.ok);
        status.textContent = removed.ok
            ? "Сохранённые данные удалены; используется исходный набор."
            : removed.error;
        this.showMessage(removed.ok ? "Данные сброшены." : "");
        this.renderApp();
    };

    handleFormInput = (event) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
            // Очищаем ошибку только исправляемого поля — остальные остаются видны.
            this.clearFieldError(event.target.name);
        }
    };

    handleCancelClick = () => {
        this.setFormMode(null);
    };
}

const elements = {
    list: document.querySelector("#task-list"),
    filters: document.querySelector("#task-filters"),
    summary: document.querySelector("#task-summary"),
    empty: document.querySelector("#empty-message"),
    message: document.querySelector("#operation-message"),
    datasetLabel: document.querySelector("#dataset-label"),
    storageStatus: document.querySelector("#storage-status"),
    form: document.querySelector("#task-form"),
    formHeading: document.querySelector("#form-heading"),
    formMode: document.querySelector("#form-mode"),
    formMessage: document.querySelector("#form-message"),
    idInput: document.querySelector("#task-id"),
    titleInput: document.querySelector("#task-title"),
    priorityInput: document.querySelector("#task-priority"),
    submitButton: document.querySelector("#form-submit"),
    cancelButton: document.querySelector("#cancel-edit"),
    resetButton: document.querySelector("#reset-data"),
};

// Готовая служебная часть: набор данных и ключ хранилища.
// demo и variant живут под разными ключами, проверки — в своём namespace.
const params = new URLSearchParams(window.location.search);
const isVariant = params.get("dataset") === "variant";
const isCheckRun = params.get("mode") === "check";
const initialTasks = isVariant ? variantTasks : demoTasks;
const datasetName = isVariant ? "variant" : "demo";
const storageKey = isCheckRun
    ? `tip-js-practice-04:checks:${datasetName}`
    : `tip-js-practice-04:${datasetName}`;

elements.datasetLabel.textContent = isVariant
    ? `Индивидуальный вариант: ${variantNumber ?? "не указан"}`
    : "Общий контрольный набор";

const app = new App(elements, { initialTasks, storage: window.localStorage, storageKey });
app.load();

// Подписки выполняются один раз — контейнеры не заменяются при перерисовке.
elements.form.addEventListener("submit", app.handleFormSubmit);
elements.form.addEventListener("input", app.handleFormInput);
elements.list.addEventListener("click", app.handleTaskListClick);
elements.filters.addEventListener("click", app.handleFilterClick);
elements.cancelButton.addEventListener("click", app.handleCancelClick);
elements.resetButton.addEventListener("click", app.handleResetClick);

try {
    app.setFormMode();
    app.renderApp();
} catch (error) {
    elements.message.textContent = `Ошибка запуска: ${error.message}`;
    console.error(error);
}
