import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
    if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
    if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
    if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
    if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
    if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
    if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
    return "Не удалось выполнить операцию.";
}

const REQUIRED_API = [
    "loadInitialData", "getTasks", "createTask", "updateTask",
    "setTaskCompleted", "deleteTask", "resetDemoData",
];
const REQUIRED_VIEW = [
    "setListState", "setTasks", "setCategories", "setTotal",
    "setFormTask", "showFormErrors", "setMutationPending", "notify",
];

function assertMethods(target, names, label) {
    if (!target || typeof target !== "object") {
        throw new TypeError(`createAppController: не передан ${label}`);
    }
    for (const name of names) {
        if (typeof target[name] !== "function") {
            throw new TypeError(`createAppController: у ${label} нет метода ${name}`);
        }
    }
}

// ═══════════════════════════════════════════════════════
//  AppController — состояние и сценарии приложения ПР6.
//  Сервер — источник истины: после каждой мутации список
//  запрашивается заново с текущими фильтрами, локальный
//  массив «на глаз» не правится. К document не обращается —
//  всё отображение идёт через view (dom-app.js).
// ═══════════════════════════════════════════════════════
class AppController {
    constructor({ api, view, validateDraft }) {
        this.api = api;
        this.view = view;
        this.validateDraft = validateDraft;

        this.tasks = [];
        this.categories = [];
        this.categoriesLoaded = false;
        this.filters = {};
        this.editingId = null;

        // Защита от гонки: каждая загрузка получает номер, и ответ
        // применяется, только если он от последней загрузки.
        this.loadController = null;
        this.loadId = 0;
    }

    // ── Загрузка ─────────────────────────────────────────

    /**
     * Пока категорий нет (первый старт или старт упал) — loadInitialData,
     * иначе только getTasks: категории не меняются от фильтра.
     */
    _loadCurrentTasks = async () => {
        this.loadController?.abort();
        const controller = new AbortController();
        this.loadController = controller;
        const loadId = ++this.loadId;
        const options = { signal: controller.signal };
        const filters = { ...this.filters };

        this.view.setListState("loading");

        try {
            let tasks;
            let meta;
            if (!this.categoriesLoaded) {
                const result = await this.api.loadInitialData(filters, options);
                if (loadId !== this.loadId) return;
                ({ tasks, meta } = result);
                this.categories = result.categories;
                this.categoriesLoaded = true;
                this.view.setCategories(this.categories);
            } else {
                const result = await this.api.getTasks(filters, options);
                if (loadId !== this.loadId) return;
                ({ tasks, meta } = result);
            }

            this.tasks = tasks;
            this.view.setTasks(tasks, this.categories);
            this.view.setTotal(meta?.total ?? tasks.length);
            this.view.setListState(tasks.length > 0 ? "ready" : "empty");
        } catch (error) {
            // Устаревший или отменённый запрос молча игнорируется —
            // отмену инициировали мы сами новой загрузкой.
            if (loadId !== this.loadId) return;
            if (error instanceof ApiError && error.kind === "aborted") return;
            this.view.setListState("error", messageForError(error));
        } finally {
            if (this.loadController === controller) this.loadController = null;
        }
    };

    // ── Мутации ──────────────────────────────────────────

    /**
     * Общая схема изменяющих операций: блокировка → запрос → сообщение →
     * повторная загрузка с текущими фильтрами → снятие блокировки.
     */
    _mutate = async (operation, successMessage) => {
        this.view.setMutationPending(true);
        try {
            await operation();
            this.view.notify(successMessage, "success");
            await this._loadCurrentTasks();
            return true;
        } catch (error) {
            this.view.notify(messageForError(error), "error");
            return false;
        } finally {
            this.view.setMutationPending(false);
        }
    };

    _findTask(id) {
        return this.tasks.find((task) => task.id === id);
    }

    _resetForm() {
        this.editingId = null;
        this.view.setFormTask(null);
        this.view.showFormErrors({});
    }

    // ── Публичные сценарии ───────────────────────────────

    start = (filters = {}) => {
        this.filters = { ...filters };
        return this._loadCurrentTasks();
    };

    applyFilters = (filters = {}) => {
        this.filters = { ...filters };
        return this._loadCurrentTasks();
    };

    refresh = () => this._loadCurrentTasks();

    submit = async (draft) => {
        // Невалидная форма не доходит до сети — ошибки показываются у полей.
        const checked = this.validateDraft(draft, this.categories);
        if (!checked.valid) {
            this.view.showFormErrors(checked.errors);
            return false;
        }
        this.view.showFormErrors({});

        const editingId = this.editingId;
        if (editingId === null) {
            return this._mutate(async () => {
                const created = await this.api.createTask(checked.value);
                this._resetForm();
                return created;
            }, "Задача создана.");
        }

        return this._mutate(async () => {
            const updated = await this.api.updateTask(editingId, checked.value);
            this._resetForm();
            return updated;
        }, `Задача № ${editingId} изменена.`);
    };

    beginEdit = (id) => {
        const task = this._findTask(id);
        if (task === undefined) {
            this.view.notify("Задача не найдена в текущем списке. Обновите список.", "error");
            return false;
        }
        this.editingId = task.id;
        this.view.setFormTask(task);
        this.view.showFormErrors({});
        return true;
    };

    cancelEdit = () => {
        this._resetForm();
    };

    /**
     * Новое значение completed — инверсия статуса из последнего
     * ответа сервера. После PATCH список перезагружается с теми же
     * фильтрами: при completed=false выполненная задача исчезнет.
     */
    toggleTask = async (id) => {
        const task = this._findTask(id);
        if (task === undefined) {
            this.view.notify("Задача не найдена в текущем списке. Обновите список.", "error");
            return false;
        }
        const completed = !task.completed;
        return this._mutate(
            () => this.api.setTaskCompleted(id, completed),
            completed ? `Задача № ${id} выполнена.` : `Задача № ${id} возвращена в работу.`,
        );
    };

    deleteTask = async (id) => {
        return this._mutate(async () => {
            await this.api.deleteTask(id);
            if (this.editingId === id) this._resetForm();
        }, `Задача № ${id} удалена.`);
    };

    resetData = async () => {
        return this._mutate(async () => {
            await this.api.resetDemoData();
            this._resetForm();
        }, "Учебный набор восстановлен.");
    };

    destroy = () => {
        this.loadController?.abort();
        this.loadController = null;
        // Сдвигаем номер — ответ, который уже в пути, не применится.
        this.loadId += 1;
    };
}

// view — адаптер из dom-app.js. Контроллер не обращается к document.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
    assertMethods(api, REQUIRED_API, "api");
    assertMethods(view, REQUIRED_VIEW, "view");
    if (typeof validateDraft !== "function") {
        throw new TypeError("createAppController: validateDraft должен быть функцией");
    }

    const controller = new AppController({ api, view, validateDraft });
    return {
        start: controller.start,
        applyFilters: controller.applyFilters,
        refresh: controller.refresh,
        submit: controller.submit,
        beginEdit: controller.beginEdit,
        cancelEdit: controller.cancelEdit,
        toggleTask: controller.toggleTask,
        deleteTask: controller.deleteTask,
        resetData: controller.resetData,
        destroy: controller.destroy,
    };
}

export { AppController };
