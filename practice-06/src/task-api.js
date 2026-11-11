import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
    return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
    return Boolean(
        value
        && typeof value === "object"
        && isPositiveSafeInteger(value.id)
        && typeof value.title === "string"
        && value.title.trim().length >= 1
        && value.title.trim().length <= 100
        && typeof value.completed === "boolean"
        && ALLOWED_PRIORITIES.has(value.priority)
        && isPositiveSafeInteger(value.categoryId),
    );
}

export function isCategory(value) {
    return Boolean(
        value
        && typeof value === "object"
        && isPositiveSafeInteger(value.id)
        && typeof value.name === "string"
        && value.name.trim().length >= 1
        && value.name.trim().length <= 100,
    );
}

// ═══════════════════════════════════════════════════════
//  TaskApi — предметный слой: путь + HTTP-метод + проверка
//  схемы ответа. DOM и пользовательские сообщения — не здесь.
//  Последний аргумент каждого метода — { signal } для отмены.
// ═══════════════════════════════════════════════════════
class TaskApi {
    constructor(client) {
        if (!client || typeof client.requestJson !== "function") {
            throw new TypeError("createTaskApi ожидает клиент с методом requestJson");
        }
        this.client = client;
    }

    // ── Проверки входа ───────────────────────────────────

    static _checkId(id) {
        if (!isPositiveSafeInteger(id)) {
            throw new TypeError("id задачи — положительное безопасное целое");
        }
    }

    /** Пропускает только completed/priority/categoryId/q (перенесено из ПР5). */
    static _normalizeFilters(filters) {
        if (filters === null || typeof filters !== "object" || Array.isArray(filters)) {
            throw new TypeError("Фильтры должны быть обычным объектом");
        }

        const query = {};
        for (const [name, value] of Object.entries(filters)) {
            if (!ALLOWED_FILTERS.has(name)) {
                throw new TypeError(`Неизвестный фильтр: ${name}`);
            }
            if (value === undefined) continue;

            if (name === "completed") {
                if (typeof value !== "boolean") throw new TypeError("completed — true или false");
                query.completed = value;
            } else if (name === "priority") {
                if (!ALLOWED_PRIORITIES.has(value)) throw new TypeError("priority — low, medium или high");
                query.priority = value;
            } else if (name === "categoryId") {
                if (!isPositiveSafeInteger(value)) throw new TypeError("categoryId — положительное целое");
                query.categoryId = value;
            } else {
                if (typeof value !== "string") throw new TypeError("q — строка");
                const q = value.trim();
                if (q.length > 100) throw new TypeError("q — не длиннее 100 символов");
                if (q !== "") query.q = q;
            }
        }
        return query;
    }

    /** { signal } пробрасываем клиенту, только если он передан. */
    static _withSignal(init, options) {
        return options?.signal ? { ...init, signal: options.signal } : init;
    }

    // ── Проверки ответа ──────────────────────────────────

    static _checkUniqueIds(items, label) {
        const ids = new Set(items.map((item) => item.id));
        if (ids.size !== items.length) {
            throw invalidResponse(`В ответе ${label} повторяются id`);
        }
    }

    static _taskFrom(payload, label) {
        if (!payload || !isTask(payload.data)) {
            throw invalidResponse(`Ответ ${label} не соответствует схеме задачи`);
        }
        return payload.data;
    }

    // ── Чтение ───────────────────────────────────────────

    /** Фильтрует сервер (query-параметры), а не локальный массив. */
    async getTasks(filters = {}, options = {}) {
        const query = TaskApi._normalizeFilters(filters);
        const payload = await this.client.requestJson("/tasks", TaskApi._withSignal({ query }, options));

        if (!payload || !Array.isArray(payload.data) || !payload.meta || typeof payload.meta !== "object") {
            throw invalidResponse("Ответ /tasks не соответствует контракту { data: [], meta }");
        }
        if (!payload.data.every(isTask)) {
            throw invalidResponse("В ответе /tasks есть задача с неверной схемой");
        }
        TaskApi._checkUniqueIds(payload.data, "/tasks");
        if (payload.meta.total !== payload.data.length) {
            throw invalidResponse("meta.total не совпадает с длиной data");
        }
        return { tasks: payload.data, meta: payload.meta };
    }

    async getTaskById(id, options = {}) {
        TaskApi._checkId(id);
        const payload = await this.client.requestJson(`/tasks/${id}`, TaskApi._withSignal({}, options));
        return TaskApi._taskFrom(payload, `/tasks/${id}`);
    }

    async getCategories(options = {}) {
        const payload = await this.client.requestJson("/categories", TaskApi._withSignal({}, options));
        if (!payload || !Array.isArray(payload.data) || !payload.data.every(isCategory)) {
            throw invalidResponse("Ответ /categories не соответствует схеме категорий");
        }
        TaskApi._checkUniqueIds(payload.data, "/categories");
        return payload.data;
    }

    /** Оба запроса стартуют до общего await; отказ любого отклоняет результат. */
    async loadInitialData(filters = {}, options = {}) {
        const [{ tasks, meta }, categories] = await Promise.all([
            this.getTasks(filters, options),
            this.getCategories(options),
        ]);
        return { tasks, categories, meta };
    }

    // ── Изменение ────────────────────────────────────────

    /** id и completed назначает сервер — в теле только title/priority/categoryId. */
    async createTask(draft, options = {}) {
        const payload = await this.client.requestJson("/tasks", TaskApi._withSignal({
            method: "POST",
            body: draft,
        }, options));
        return TaskApi._taskFrom(payload, "POST /tasks");
    }

    /** PATCH — частичное изменение: уходят только переданные поля. */
    async updateTask(id, changes, options = {}) {
        TaskApi._checkId(id);
        const payload = await this.client.requestJson(`/tasks/${id}`, TaskApi._withSignal({
            method: "PATCH",
            body: changes,
        }, options));
        return TaskApi._taskFrom(payload, `PATCH /tasks/${id}`);
    }

    async setTaskCompleted(id, completed, options = {}) {
        if (typeof completed !== "boolean") {
            throw new TypeError("completed — true или false");
        }
        return this.updateTask(id, { completed }, options);
    }

    /** Успешный DELETE — 204 без тела; клиент превращает его в null. */
    async deleteTask(id, options = {}) {
        TaskApi._checkId(id);
        const payload = await this.client.requestJson(`/tasks/${id}`, TaskApi._withSignal({
            method: "DELETE",
        }, options));
        if (payload !== null) {
            throw invalidResponse(`DELETE /tasks/${id} неожиданно вернул тело ответа`);
        }
        return null;
    }

    async resetDemoData(options = {}) {
        const payload = await this.client.requestJson("/debug/reset", TaskApi._withSignal({
            method: "POST",
        }, options));
        const data = payload?.data;
        if (!data || data.reset !== true || !Number.isSafeInteger(data.total)) {
            throw invalidResponse("Ответ /debug/reset не подтверждает восстановление набора");
        }
        return data;
    }
}

// Методы результата:
// getTasks, getTaskById, getCategories, loadInitialData, createTask, updateTask,
// setTaskCompleted, deleteTask и resetDemoData.
export function createTaskApi(client) {
    const api = new TaskApi(client);
    return {
        getTasks: (filters, options) => api.getTasks(filters, options),
        getTaskById: (id, options) => api.getTaskById(id, options),
        getCategories: (options) => api.getCategories(options),
        loadInitialData: (filters, options) => api.loadInitialData(filters, options),
        createTask: (draft, options) => api.createTask(draft, options),
        updateTask: (id, changes, options) => api.updateTask(id, changes, options),
        setTaskCompleted: (id, completed, options) => api.setTaskCompleted(id, completed, options),
        deleteTask: (id, options) => api.deleteTask(id, options),
        resetDemoData: (options) => api.resetDemoData(options),
    };
}

export { TaskApi };
