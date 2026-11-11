// ═══════════════════════════════════════════════════════
//  TaskSelectors — отбор видимых задач по фильтру.
//  Именованный export — под контракт браузерных проверок
//  (import { getVisibleTasks } from "./task-selectors.js").
// ═══════════════════════════════════════════════════════
class TaskSelectors {
    /**
     * @param {object[]} tasks
     * @param {"all"|"pending"|"completed"} filter
     * @returns {object[]} новый массив; исходный порядок и объекты сохраняются.
     */
    static getVisibleTasks(tasks, filter = "all") {
        if (filter === "pending") {
            return tasks.filter((task) => task.completed === false);
        }
        if (filter === "completed") {
            return tasks.filter((task) => task.completed === true);
        }
        return [...tasks];
    }
}

export function getVisibleTasks(tasks, filter = "all") {
    return TaskSelectors.getVisibleTasks(tasks, filter);
}

export { TaskSelectors };
