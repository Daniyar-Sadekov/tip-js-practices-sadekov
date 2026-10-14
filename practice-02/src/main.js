import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
    addTask,
    setTaskCompleted,
    renameTask,
    removeTask,
    getPendingTasks,
    getTaskTitles,
    getTaskStats,
} from "./task-service.js";

// ═══════════════════════════════════════════════════════
//  ScenarioRunner — прогоняет общий и индивидуальный сценарии
//  поверх task-service.js. Прикладная логика остаётся в
//  TaskService; здесь только последовательность действий и вывод.
// ═══════════════════════════════════════════════════════
class ScenarioRunner {
    constructor(title, initialTasks) {
        this.title = title;
        this.tasks = initialTasks;
    }

    logSummary(label) {
        const titles = getTaskTitles(this.tasks);
        const pending = getPendingTasks(this.tasks);
        const { total, completed, pending: pendingCount, progress } = getTaskStats(this.tasks);

        console.log(`[${label}]`);
        console.log("  Названия:", titles);
        console.log("  Невыполненные id:", pending.map((task) => task.id));
        if (total === 0) {
            console.log("  Задач пока нет");
        } else {
            console.log(`  Всего: ${total}; выполнено: ${completed}; осталось: ${pendingCount}; прогресс: ${progress.toFixed(1)}%`);
        }
    }

    /** Применяет результат операции: заменяет состояние только при успехе. */
    apply(result, actionLabel) {
        if (result.ok) {
            this.tasks = result.tasks;
            console.log(`  ✓ ${actionLabel}`);
        } else {
            console.error(`  ✗ ${actionLabel} — Ошибка: ${result.error}`);
        }
        return result.ok;
    }
}

console.log("═══════════════════════════════════════");
console.log("ОБЩИЙ СЦЕНАРИЙ (demoTasks)");
console.log("═══════════════════════════════════════");

const general = new ScenarioRunner("Общий набор", demoTasks);
general.logSummary("Исходное состояние");

general.apply(addTask(general.tasks, 20, "Добавить проверку", "high"), "Добавлена задача id=20");
general.logSummary("После добавления id=20");

general.apply(setTaskCompleted(general.tasks, 4, true), "Задача id=4 выполнена");
general.logSummary("После выполнения id=4");

general.apply(renameTask(general.tasks, 10, "Подготовить инструкцию запуска"), "Переименована задача id=10");
general.logSummary("После переименования id=10");

general.apply(removeTask(general.tasks, 7), "Удалена задача id=7");
general.logSummary("После удаления id=7");

// Демонстрация обработанного отказа: повторное добавление существующего id.
console.log("[Проверка отказа]");
general.apply(addTask(general.tasks, 20, "Дубликат", "low"), "Повторное добавление id=20 (ожидается отказ)");

console.log("[Проверка сохранности исходных данных]");
console.log("  demoTasks по-прежнему исходный:", JSON.stringify(demoTasks));

console.log("\n═══════════════════════════════════════");
console.log(`ИНДИВИДУАЛЬНЫЙ СЦЕНАРИЙ (вариант ${variantNumber})`);
console.log("═══════════════════════════════════════");

const variant = new ScenarioRunner(`Вариант ${variantNumber}`, variantTasks);
variant.logSummary("Исходное состояние");

variant.apply(addTask(variant.tasks, 80, "Опубликовать анонс релиза", "high"), "Добавлена задача id=80");
variant.logSummary("После добавления id=80");

variant.apply(setTaskCompleted(variant.tasks, 11, true), "Задача id=11 подтверждена выполненной");
variant.logSummary("После повторного подтверждения id=11");

variant.apply(renameTask(variant.tasks, 23, "Проверить сборку и тесты проекта"), "Переименована задача id=23");
variant.logSummary("После переименования id=23");

variant.apply(removeTask(variant.tasks, 37), "Удалена задача id=37");
variant.logSummary("После удаления id=37");

console.log("[Проверка отказа: повторное добавление id=80]");
variant.apply(addTask(variant.tasks, 80, "Дубликат", "low"), "Повторное добавление id=80 (ожидается отказ)");

console.log("[Проверка сохранности индивидуального набора]");
console.log("  variantTasks по-прежнему исходный:", JSON.stringify(variantTasks));

variant.logSummary("Итоговое состояние");
