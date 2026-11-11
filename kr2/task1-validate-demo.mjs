import { validateTaskDraft } from "../practice-04/src/form-validation.js";

// КР2, задание 1 — проверка названия в validateTaskDraft (ПР4).
// Для обоих вызовов: tasks = [], id = "20", priority = "high".
const tasks = [];

console.log('=== Вызов 1: title = "  Изучить localStorage  " ===');
const result1 = validateTaskDraft({ id: "20", title: "  Изучить localStorage  ", priority: "high" }, tasks);
console.log("ok:", result1.ok);
console.log("value:", result1.value);
console.log("value.title:", JSON.stringify(result1.value.title));

console.log('\n=== Вызов 2: title = "   " ===');
const result2 = validateTaskDraft({ id: "20", title: "   ", priority: "high" }, tasks);
console.log("ok:", result2.ok);
console.log("errors.title:", result2.errors.title);
