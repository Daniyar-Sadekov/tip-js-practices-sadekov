import { setTaskCompleted } from "../practice-02/src/task-service.js";

// КР1, задание 3 — тот же общий demoTasks
const demoTasks = [
    { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
    { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
    { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
    { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

console.log("=== Вызов 1: setTaskCompleted(demoTasks, 4, true) ===");
const result1 = setTaskCompleted(demoTasks, 4, true);
console.log("ok:", result1.ok);
console.log("новый статус id=4:", result1.tasks.find((t) => t.id === 4).completed);
console.log("исходный массив, статус id=4:", demoTasks.find((t) => t.id === 4).completed);

console.log("\n=== Вызов 2: setTaskCompleted(demoTasks, 777, true) — несуществующий id ===");
const result2 = setTaskCompleted(demoTasks, 777, true);
console.log("ok:", result2.ok);
console.log("error:", result2.error);
console.log("исходный массив не изменился:", JSON.stringify(demoTasks.map((t) => t.completed)));
