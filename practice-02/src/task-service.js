// ═══════════════════════════════════════════════════════
//  TaskService — вся прикладная логика ПР2 в виде класса.
//  Наружу отдаются именованные функции-обёртки (внизу файла),
//  потому что checks.js и main.js импортируют их напрямую
//  по контракту методички: import { createTask, ... }.
// ═══════════════════════════════════════════════════════
class TaskService {

    // ── Внутренние проверки (не экспортируются) ──────────

    /** @returns {boolean} id — положительное безопасное целое число. */
    static _isValidId(id) {
        return Number.isSafeInteger(id) && id > 0;
    }

    /**
     * Проверяет и нормализует название задачи.
     * @returns {{ok: true, title: string} | {ok: false, error: string}}
     */
    static _normalizeTitle(value) {
        if (typeof value !== "string") {
            return { ok: false, error: "Название должно быть строкой" };
        }
        const title = value.trim();
        if (title.length < 1 || title.length > 100) {
            return { ok: false, error: "Длина названия должна быть от 1 до 100 символов" };
        }
        return { ok: true, title };
    }

    /** @returns {boolean} priority — одно из low/medium/high. */
    static _isValidPriority(value) {
        return value === "low" || value === "medium" || value === "high";
    }

    // ── Задание 2. Модель данных и создание задачи ───────

    /**
     * @returns {{ok: true, task: object} | {ok: false, error: string}}
     */
    static createTask(id, title, priority = "medium") {
        if (!TaskService._isValidId(id)) {
            return { ok: false, error: "Некорректный id: нужно положительное безопасное целое число" };
        }

        const titleResult = TaskService._normalizeTitle(title);
        if (!titleResult.ok) {
            return titleResult;
        }

        if (!TaskService._isValidPriority(priority)) {
            return { ok: false, error: "Приоритет должен быть одним из: low, medium, high" };
        }

        return {
            ok: true,
            task: { id, title: titleResult.title, completed: false, priority },
        };
    }

    // ── Задание 3. Чтение списка и расчёт сводки ─────────

    static findTaskById(tasks, id) {
        return tasks.find((task) => task.id === id);
    }

    static getPendingTasks(tasks) {
        return tasks.filter((task) => task.completed === false);
    }

    static getTaskTitles(tasks) {
        return tasks.map((task) => task.title);
    }

    static getTaskStats(tasks) {
        const total = tasks.length;
        const completed = tasks.filter((task) => task.completed === true).length;
        const pending = total - completed;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        return { total, completed, pending, progress };
    }

    // ── Задание 4. Добавление, изменение и удаление ──────

    static addTask(tasks, id, title, priority = "medium") {
        if (TaskService.findTaskById(tasks, id) !== undefined) {
            return { ok: false, error: `Задача с id = ${id} уже существует` };
        }

        const created = TaskService.createTask(id, title, priority);
        if (!created.ok) {
            return created;
        }

        return { ok: true, tasks: [...tasks, created.task] };
    }

    static setTaskCompleted(tasks, id, completed) {
        if (!TaskService._isValidId(id)) {
            return { ok: false, error: "Некорректный id" };
        }
        if (typeof completed !== "boolean") {
            return { ok: false, error: "completed должен быть true или false" };
        }
        if (TaskService.findTaskById(tasks, id) === undefined) {
            return { ok: false, error: `Задача с id = ${id} не найдена` };
        }

        const updatedTasks = tasks.map((task) =>
            task.id === id ? { ...task, completed } : task
        );

        return { ok: true, tasks: updatedTasks };
    }

    static renameTask(tasks, id, title) {
        if (!TaskService._isValidId(id)) {
            return { ok: false, error: "Некорректный id" };
        }

        const titleResult = TaskService._normalizeTitle(title);
        if (!titleResult.ok) {
            return titleResult;
        }

        if (TaskService.findTaskById(tasks, id) === undefined) {
            return { ok: false, error: `Задача с id = ${id} не найдена` };
        }

        const updatedTasks = tasks.map((task) =>
            task.id === id ? { ...task, title: titleResult.title } : task
        );

        return { ok: true, tasks: updatedTasks };
    }

    static removeTask(tasks, id) {
        if (!TaskService._isValidId(id)) {
            return { ok: false, error: "Некорректный id" };
        }
        if (TaskService.findTaskById(tasks, id) === undefined) {
            return { ok: false, error: `Задача с id = ${id} не найдена` };
        }

        return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
    }
}

// ═══════════════════════════════════════════════════════
//  Именованные экспорты — тонкие обёртки над методами класса.
//  Сигнатуры и имена совпадают с контрактом checks.js/main.js.
// ═══════════════════════════════════════════════════════
export function createTask(id, title, priority = "medium") {
    return TaskService.createTask(id, title, priority);
}

export function findTaskById(tasks, id) {
    return TaskService.findTaskById(tasks, id);
}

export function getPendingTasks(tasks) {
    return TaskService.getPendingTasks(tasks);
}

export function getTaskTitles(tasks) {
    return TaskService.getTaskTitles(tasks);
}

export function getTaskStats(tasks) {
    return TaskService.getTaskStats(tasks);
}

export function addTask(tasks, id, title, priority = "medium") {
    return TaskService.addTask(tasks, id, title, priority);
}

export function setTaskCompleted(tasks, id, completed) {
    return TaskService.setTaskCompleted(tasks, id, completed);
}

export function renameTask(tasks, id, title) {
    return TaskService.renameTask(tasks, id, title);
}

export function removeTask(tasks, id) {
    return TaskService.removeTask(tasks, id);
}

export { TaskService };
