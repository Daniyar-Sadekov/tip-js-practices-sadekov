"use strict";

// КР1, задание 1 — три проверочных запуска progress.js (класс TaskProgressReport)
// с подписанными входными данными. Класс идентичен practice-01/js/progress.js.

class TaskProgressReport {
    constructor(totalTasks, completedTasks) {
        this.totalTasks = totalTasks;
        this.completedTasks = completedTasks;
    }

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

    build() {
        const { totalTasks, completedTasks } = this;
        const remaining = totalTasks - completedTasks;
        const percentage = (completedTasks / totalTasks) * 100;
        let status;
        if (completedTasks === 0) status = "Не начато";
        else if (completedTasks === totalTasks) status = "Завершено";
        else status = "В работе";
        return { remaining, percentage, status };
    }

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

console.log("=== Запуск 1: totalTasks=12, completedTasks=5 ===");
new TaskProgressReport(12, 5).print();

console.log("\n=== Запуск 2: totalTasks=0, completedTasks=0 ===");
new TaskProgressReport(0, 0).print();

console.log("\n=== Запуск 3: totalTasks=5, completedTasks=6 ===");
new TaskProgressReport(5, 6).print();
