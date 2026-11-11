import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
    return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
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

function isCategory(value) {
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
//  TaskApi — предметный слой: знает маршруты /tasks и
//  /categories, проверяет фильтры до запроса и схему
//  ответа после. Транспорт (fetch, статусы) — в client.
// ═══════════════════════════════════════════════════════
class TaskApi {
    constructor(client) {
        if (!client || typeof client.requestJson !== "function") {
            throw new TypeError("createTaskApi ожидает клиент с методом requestJson");
        }
        this.client = client;
    }

    // ── Фильтры (проверка до запроса) ────────────────────

    /**
     * Пропускает только completed/priority/categoryId/q. false остаётся
     * boolean — в строку его превратит URLSearchParams в buildUrl.
     */
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

    // ── Схема ответа (проверка после запроса) ────────────

    static _checkUniqueIds(items, label) {
        const ids = new Set(items.map((item) => item.id));
        if (ids.size !== items.length) {
            throw invalidResponse(`В ответе ${label} повторяются id`);
        }
    }

    static _checkTaskCollection(payload) {
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

    // ── Методы ───────────────────────────────────────────

    /** Фильтрует сервер (query-параметры), а не локальный массив. */
    async getTasks(filters = {}) {
        const query = TaskApi._normalizeFilters(filters);
        const payload = await this.client.requestJson("/tasks", { query });
        return TaskApi._checkTaskCollection(payload);
    }

    async getTaskById(id) {
        if (!isPositiveSafeInteger(id)) {
            throw new TypeError("id задачи — положительное безопасное целое");
        }
        const payload = await this.client.requestJson(`/tasks/${id}`);
        if (!payload || !isTask(payload.data)) {
            throw invalidResponse(`Ответ /tasks/${id} не соответствует схеме задачи`);
        }
        return payload.data;
    }

    async getCategories() {
        const payload = await this.client.requestJson("/categories");
        if (!payload || !Array.isArray(payload.data) || !payload.data.every(isCategory)) {
            throw invalidResponse("Ответ /categories не соответствует схеме категорий");
        }
        TaskApi._checkUniqueIds(payload.data, "/categories");
        return payload.data;
    }

    /**
     * Оба запроса стартуют до общего await — ждём уже летящие Promise.
     * Отказ любого из них отклоняет результат (Promise.all).
     */
    async loadInitialData(filters = {}) {
        const tasksPromise = this.getTasks(filters);
        const categoriesPromise = this.getCategories();

        const [{ tasks, meta }, categories] = await Promise.all([tasksPromise, categoriesPromise]);
        return { tasks, categories, meta };
    }
}

// client — объект, созданный createApiClient.
// getTasks(filters) -> Promise<{ tasks, meta }>
// getTaskById(id) -> Promise<task>
// getCategories() -> Promise<category[]>
// loadInitialData(filters) -> Promise<{ tasks, categories, meta }>
export function createTaskApi(client) {
    const api = new TaskApi(client);
    // Методы отдаются привязанными — их можно передавать как колбэки.
    return {
        getTasks: (filters) => api.getTasks(filters),
        getTaskById: (id) => api.getTaskById(id),
        getCategories: () => api.getCategories(),
        loadInitialData: (filters) => api.loadInitialData(filters),
    };
}

export { TaskApi };
