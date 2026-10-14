import { getPendingTasks } from "../practice-02/src/task-service.js";

// КР1, задание 2 — общий demoTasks из ПР2/ПР3
const demoTasks = [
    { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
    { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
    { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
    { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

console.log("=== Вызов 1: getPendingTasks(demoTasks) ===");
console.log(JSON.stringify(getPendingTasks(demoTasks).map((t) => t.id)));

console.log("\n=== Вызов 2: getPendingTasks([]) ===");
console.log(JSON.stringify(getPendingTasks([])));

console.log("\n=== Исходный массив не изменился ===");
console.log(JSON.stringify(demoTasks.map((t) => ({ id: t.id, completed: t.completed }))));
