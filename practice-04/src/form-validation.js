// ═══════════════════════════════════════════════════════
//  FormValidation — чистая проверка черновика формы.
//  Не трогает DOM, не показывает сообщения и не меняет вход:
//  показ ошибок около полей делает main.js (showFormErrors).
// ═══════════════════════════════════════════════════════
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

class FormValidation {

    /** @returns {boolean} положительное безопасное целое. */
    static _isValidId(id) {
        return Number.isSafeInteger(id) && id > 0;
    }

    /**
     * id из FormData приходит строкой. Пустую строку отсекаем явно:
     * Number("") === 0, и без этой проверки пустое поле выглядело бы
     * как «id = 0», а не как «id не указан».
     * @returns {{ok: true, id: number} | {ok: false, error: string}}
     */
    static _parseId(raw) {
        if (typeof raw === "string" && raw.trim() === "") {
            return { ok: false, error: "Укажите идентификатор" };
        }
        if (raw === null || raw === undefined) {
            return { ok: false, error: "Укажите идентификатор" };
        }
        const id = Number(raw);
        if (!FormValidation._isValidId(id)) {
            return { ok: false, error: "id — положительное целое число" };
        }
        return { ok: true, id };
    }

    static _checkId(draft, tasks, editingId) {
        // Режим редактирования: поле id disabled и в FormData не попадает,
        // поэтому источник истины — editingId, а не draft.id.
        if (editingId !== null) {
            if (!FormValidation._isValidId(editingId)) {
                return { ok: false, error: "Некорректный id редактируемой задачи" };
            }
            if (!tasks.some((task) => task.id === editingId)) {
                return { ok: false, error: `Задача с id = ${editingId} не найдена` };
            }
            return { ok: true, id: editingId };
        }

        const parsed = FormValidation._parseId(draft.id);
        if (!parsed.ok) return parsed;

        if (tasks.some((task) => task.id === parsed.id)) {
            return { ok: false, error: `Задача с id = ${parsed.id} уже существует` };
        }
        return parsed;
    }

    static _checkTitle(raw) {
        if (typeof raw !== "string") {
            return { ok: false, error: "Название должно быть строкой" };
        }
        const title = raw.trim();
        if (title.length < 1 || title.length > 100) {
            return { ok: false, error: "Название — от 1 до 100 символов без краевых пробелов" };
        }
        return { ok: true, title };
    }

    static _checkPriority(raw) {
        if (!ALLOWED_PRIORITIES.has(raw)) {
            return { ok: false, error: "Выберите приоритет: low, medium или high" };
        }
        return { ok: true, priority: raw };
    }

    /**
     * Все три поля проверяются независимо, чтобы пользователь сразу
     * увидел все ошибки, а не исправлял их по одной.
     * @returns {{ok: true, value: {id, title, priority}} | {ok: false, errors: object}}
     */
    static validateTaskDraft(draft, tasks, editingId = null) {
        const idResult = FormValidation._checkId(draft, tasks, editingId);
        const titleResult = FormValidation._checkTitle(draft.title);
        const priorityResult = FormValidation._checkPriority(draft.priority);

        const errors = {};
        if (!idResult.ok) errors.id = idResult.error;
        if (!titleResult.ok) errors.title = titleResult.error;
        if (!priorityResult.ok) errors.priority = priorityResult.error;

        if (Object.keys(errors).length > 0) {
            return { ok: false, errors };
        }

        return {
            ok: true,
            value: {
                id: idResult.id,
                title: titleResult.title,
                priority: priorityResult.priority,
            },
        };
    }
}

export function validateTaskDraft(draft, tasks, editingId = null) {
    return FormValidation.validateTaskDraft(draft, tasks, editingId);
}

export { FormValidation };
