"use strict";

// ═══════════════════════════════════════════════════════
//  ЗАДАНИЕ 5 — отладка (исправленная версия)
//  Исходный вариант с двумя ошибками — в отчёте (README) и
//  в истории Git; здесь остаётся только исправленный код,
//  как того требует методичка.
// ═══════════════════════════════════════════════════════

const plannedText = "8";
const completedText = "3";
const additionalText = "2";

// Ошибка 1 (исправлена): строки складывались конкатенацией
// ("3" + "2" = "32") вместо числового сложения. Нужно явно
// привести оба слагаемых через Number() перед арифметикой.
const completedTotal = Number(completedText) + Number(additionalText);
const remainingTasks = Number(plannedText) - completedTotal;

console.log("Выполнено:", completedTotal);
console.log("Осталось:", remainingTasks);

let controlSum = 0;

// Ошибка 2 (исправлена): условие `taskNumber < 4` не включало
// четвёртую задачу. По условию сумма должна быть от 1 до 4
// включительно — условие изменено на `taskNumber <= 4`.
for (let taskNumber = 1; taskNumber <= 4; taskNumber += 1) {
    controlSum += taskNumber;
}

console.log("Контрольная сумма:", controlSum);
