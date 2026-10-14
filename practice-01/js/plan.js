"use strict";

// Вариант 7: totalTasks = 10, completedTasks = 7, dailyLimit = 3.
const totalTasks = 10;
const completedTasks = 7;
const dailyLimit = 3;

// ═══════════════════════════════════════════════════════
//  TaskPlanner — план выполнения оставшихся задач по дням
// ═══════════════════════════════════════════════════════
class TaskPlanner {
    constructor(totalTasks, completedTasks, dailyLimit) {
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
        this.dailyLimit = dailyLimit;
    }

    /** Проверка totalTasks/completedTasks (правила задания 3) и dailyLimit. */
    validate() {
        const { totalTasks, completedTasks, dailyLimit } = this;

        if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
            return { ok: false, error: "Ошибка: количество задач должно быть целым числом" };
        }
        if (totalTasks < 0 || totalTasks > 1000) {
            return { ok: false, error: "Ошибка: totalTasks вне диапазона 0..1000" };
        }
        if (completedTasks < 0 || completedTasks > totalTasks) {
            return { ok: false, error: "Ошибка: некорректное число выполненных задач" };
        }
        if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 1000) {
            return { ok: false, error: "Ошибка: дневная норма должна быть целым числом от 1 до 1000" };
        }
        return { ok: true };
    }

    /** Пошагово планирует дни через while, возвращает { days, log }. */
    run() {
        let remaining = this.totalTasks - this.completedTasks;
        const log = [];
        let day = 0;

        while (remaining > 0) {
            day += 1;
            const doneToday = Math.min(this.dailyLimit, remaining);
            remaining -= doneToday;
            log.push({ day, doneToday, remaining });
        }

        return { days: day, log };
    }

    print() {
        const validation = this.validate();
        if (!validation.ok) {
            console.log(validation.error);
            return;
        }

        const remainingAtStart = this.totalTasks - this.completedTasks;
        if (remainingAtStart === 0) {
            console.log("Все задачи уже выполнены");
            console.log("Потребуется дней: 0");
            return;
        }

        console.log(`Осталось задач: ${remainingAtStart}`);
        const { days, log } = this.run();
        for (const entry of log) {
            console.log(`День ${entry.day}: выполнено ${entry.doneToday}, осталось ${entry.remaining}`);
        }
        console.log(`Потребуется дней: ${days}`);
    }
}

new TaskPlanner(totalTasks, completedTasks, dailyLimit).print();

// ═══════════════════════════════════════════════════════
//  Обязательные проверки задания 4 (протокол — в README)
// ═══════════════════════════════════════════════════════
// (12, 5, 3)   → 3 дня, в последний день выполнена 1 задача
// (10, 4, 3)   → 2 дня, по 3 задачи в день
// (5, 3, 10)   → 1 день, выполнены 2 оставшиеся задачи
// (5, 5, 2)    → 0 дней
// (0, 0, 2)    → 0 дней
// (5, 2, 0)    → Ошибка; цикл не запускается
// (5, 2, 1.5)  → Ошибка: дробная дневная норма
// (5, 6, 2)    → Ошибка: некорректное число выполненных задач
// (5, 2, "2")  → Ошибка: дневная норма задана строкой
// (5, 2, 1001) → Ошибка: превышена верхняя граница нормы
