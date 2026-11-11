const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// ═══════════════════════════════════════════════════════
//  FormValidation — чистая проверка черновика формы ПР6.
//  id здесь нет: его назначает сервер. Категория должна
//  быть среди загруженных с API. DOM не используется.
// ═══════════════════════════════════════════════════════
class FormValidation {
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
            return { ok: false, error: "Выберите приоритет: низкий, средний или высокий" };
        }
        return { ok: true, priority: raw };
    }

    /** Значение select приходит строкой — пустую отсекаем до Number (Number("") === 0). */
    static _checkCategory(raw, categories) {
        if (raw === "" || raw === null || raw === undefined) {
            return { ok: false, error: "Выберите категорию" };
        }
        const categoryId = Number(raw);
        if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
            return { ok: false, error: "Некорректная категория" };
        }
        if (!categories.some((category) => category.id === categoryId)) {
            return { ok: false, error: "Такой категории нет на сервере" };
        }
        return { ok: true, categoryId };
    }

    /** @returns {{valid: boolean, value: object|null, errors: object}} */
    static validateTaskDraft(draft, categories) {
        const titleResult = FormValidation._checkTitle(draft?.title);
        const priorityResult = FormValidation._checkPriority(draft?.priority);
        const categoryResult = FormValidation._checkCategory(draft?.categoryId, categories ?? []);

        const errors = {};
        if (!titleResult.ok) errors.title = titleResult.error;
        if (!priorityResult.ok) errors.priority = priorityResult.error;
        if (!categoryResult.ok) errors.categoryId = categoryResult.error;

        if (Object.keys(errors).length > 0) {
            return { valid: false, value: null, errors };
        }

        return {
            valid: true,
            value: {
                title: titleResult.title,
                priority: priorityResult.priority,
                categoryId: categoryResult.categoryId,
            },
            errors: {},
        };
    }
}

// Возвращает { valid, value, errors }.
export function validateTaskDraft(draft, categories) {
    return FormValidation.validateTaskDraft(draft, categories);
}

export { FormValidation };
