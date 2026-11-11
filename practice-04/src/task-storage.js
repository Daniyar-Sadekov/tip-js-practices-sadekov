export const STORAGE_VERSION = 1;

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// ═══════════════════════════════════════════════════════
//  TaskStorage — граница localStorage: схема JSON-оболочки
//  { version, tasks }, чтение/запись и перехват исключений.
//  storage передаётся аргументом, а не берётся из window:
//  так модуль проверяется в Node.js объектом-имитацией,
//  а внешняя зависимость видна прямо в сигнатуре.
// ═══════════════════════════════════════════════════════
class TaskStorage {

    /** Одна задача строго соответствует сохранённой схеме (без нормализации). */
    static _isValidTask(task) {
        if (task === null || typeof task !== "object" || Array.isArray(task)) return false;

        const { id, title, completed, priority } = task;
        return Number.isSafeInteger(id) && id > 0
            && typeof title === "string"
            && title === title.trim()
            && title.length >= 1 && title.length <= 100
            && typeof completed === "boolean"
            && ALLOWED_PRIORITIES.has(priority);
    }

    /**
     * Проверяется весь массив: одна плохая запись или повтор id —
     * и список отклоняется целиком, частично данные не используются.
     */
    static isValidTaskList(value) {
        if (!Array.isArray(value)) return false;

        const seenIds = new Set();
        for (const task of value) {
            if (!TaskStorage._isValidTask(task)) return false;
            if (seenIds.has(task.id)) return false;
            seenIds.add(task.id);
        }
        return true;
    }

    static _copy(tasks) {
        return tasks.map((task) => ({ ...task }));
    }

    static loadTasks(storage, key, fallbackTasks) {
        // Копия создаётся заранее: при любом исходе наружу уходит
        // независимый массив, и правка currentTasks не заденет data.js.
        const fallback = TaskStorage._copy(fallbackTasks);
        const fail = (error) => ({ ok: false, source: "fallback", tasks: fallback, error });

        let raw;
        try {
            raw = storage.getItem(key);
        } catch (error) {
            return fail(`Не удалось прочитать localStorage: ${error.message}. Используется исходный набор.`);
        }

        if (raw === null) {
            return { ok: true, source: "initial", tasks: fallback };
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return fail("Сохранённые данные повреждены (некорректный JSON). Используется исходный набор.");
        }

        // Успешный JSON.parse подтверждает только синтаксис —
        // версию и схему задач проверяем отдельно.
        if (parsed === null || typeof parsed !== "object" || parsed.version !== STORAGE_VERSION) {
            return fail("Неизвестная версия сохранённых данных. Используется исходный набор.");
        }
        if (!TaskStorage.isValidTaskList(parsed.tasks)) {
            return fail("Сохранённые задачи не соответствуют схеме. Используется исходный набор.");
        }

        return { ok: true, source: "storage", tasks: TaskStorage._copy(parsed.tasks) };
    }

    static saveTasks(storage, key, tasks) {
        if (!TaskStorage.isValidTaskList(tasks)) {
            return { ok: false, error: "Список задач некорректен и не был сохранён." };
        }
        try {
            const json = JSON.stringify({ version: STORAGE_VERSION, tasks });
            storage.setItem(key, json);
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                error: `Не удалось сохранить в localStorage: ${error.message}. После перезагрузки изменения могут потеряться.`,
            };
        }
    }

    /** Удаляет ровно один ключ — без clear(), чтобы не задеть чужие данные origin. */
    static removeSavedTasks(storage, key) {
        try {
            storage.removeItem(key);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: `Не удалось удалить сохранённые данные: ${error.message}` };
        }
    }
}

export function isValidTaskList(value) {
    return TaskStorage.isValidTaskList(value);
}

export function loadTasks(storage, key, fallbackTasks) {
    return TaskStorage.loadTasks(storage, key, fallbackTasks);
}

export function saveTasks(storage, key, tasks) {
    return TaskStorage.saveTasks(storage, key, tasks);
}

export function removeSavedTasks(storage, key) {
    return TaskStorage.removeSavedTasks(storage, key);
}

export { TaskStorage };
