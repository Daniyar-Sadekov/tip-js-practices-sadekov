// Общий контрольный набор. Для своего варианта ниже предусмотрен отдельный массив.
// Идентификатор задачи не совпадает с её индексом в массиве.
export const demoTasks = [
    { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
    { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
    { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
    { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

// ═══════════════════════════════════════════════════════
//  Индивидуальный вариант 7 — «Подготовка учебного релиза»
//  K = 6: все шесть задач изначально выполнены.
// ═══════════════════════════════════════════════════════
export const variantNumber = 7;

export const variantTasks = [
    { id: 11, title: "Собрать чек-лист релиза", completed: true, priority: "high" },
    { id: 23, title: "Проверить сборку проекта", completed: true, priority: "medium" },
    { id: 37, title: "Обновить журнал изменений", completed: true, priority: "low" },
    { id: 41, title: "Прогнать регресс-тесты", completed: true, priority: "medium" },
    { id: 58, title: "Подготовить архив релиза", completed: true, priority: "high" },
    { id: 64, title: "Опубликовать релиз", completed: true, priority: "low" },
];
