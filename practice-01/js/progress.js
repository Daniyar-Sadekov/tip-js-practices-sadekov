"use strict";

// Вариант 7: totalTasks = 10, completedTasks = 7.
const totalTasks = 10;
const completedTasks = 7;

// ═══════════════════════════════════════════════════════
//  TaskProgressReport — сводка выполнения задач
// ═══════════════════════════════════════════════════════
class TaskProgressReport {
    constructor(totalTasks, completedTasks) {
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
    }

    /**
     * Проверяет входные данные по правилам задания 3.
     * @returns {{ok: true} | {ok: false, error: string}}
     */
    validate() {
        const { totalTasks, completedTasks } = this;

        if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
            return { ok: false, error: "Ошибка: количество задач должно быть целым числом" };
        }
        if (totalTasks < 0 || totalTasks > 1000) {
            return { ok: false, error: "Ошибка: totalTasks вне диапазона 0..1000" };
        }
        if (completedTasks < 0 || completedTasks > totalTasks) {
            return { ok: false, error: "Ошибка: выполнено больше, чем существует, либо отрицательное количество" };
        }
        return { ok: true };
    }

    /**
     * Строит сводку. Вызывать только после успешной validate().
     */
    build() {
        const { totalTasks, completedTasks } = this;
        const remaining = totalTasks - completedTasks;
        const percentage = (completedTasks / totalTasks) * 100;

        let status;
        if (completedTasks === 0) {
            status = "Не начато";
        } else if (completedTasks === totalTasks) {
            status = "Завершено";
        } else {
            status = "В работе";
        }

        return { remaining, percentage, status };
    }

    /** Проверяет, выводит результат или ошибку в консоль. */
    print() {
        const { totalTasks, completedTasks } = this;

        const validation = this.validate();
        if (!validation.ok) {
            console.log(validation.error);
            return;
        }

        if (totalTasks === 0 && completedTasks === 0) {
            console.log("Задач пока нет");
            return;
        }

        const { remaining, percentage, status } = this.build();
        console.log(`Всего задач: ${totalTasks}`);
        console.log(`Выполнено: ${completedTasks}`);
        console.log(`Осталось: ${remaining}`);
        console.log(`Прогресс: ${percentage.toFixed(1)}%`);
        console.log(`Статус: ${status}`);
    }
}

new TaskProgressReport(totalTasks, completedTasks).print();

// ═══════════════════════════════════════════════════════
//  Обязательные проверки задания 3 (запускались по очереди
//  подстановкой значений выше; протокол — в README).
// ═══════════════════════════════════════════════════════
// (12, 5)      → осталось 7, прогресс 41.7%, «В работе»
// (0, 0)       → «Задач пока нет»
// (5, 0)       → осталось 5, прогресс 0.0%, «Не начато»
// (5, 5)       → осталось 0, прогресс 100.0%, «Завершено»
// (5, 6)       → Ошибка: выполнено больше, чем существует
// (-1, 0)      → Ошибка: отрицательное количество
// (5, 2.5)     → Ошибка: дробное количество
// ("5", 2)     → Ошибка: вместо числа передана строка
// (1001, 0)    → Ошибка: превышена верхняя граница
// (NaN, 0)     → Ошибка: недопустимое числовое значение
