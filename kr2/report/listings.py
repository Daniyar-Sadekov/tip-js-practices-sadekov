L1 = '''// practice-04/src/form-validation.js — проверка и нормализация названия
static _checkTitle(raw) {
    if (typeof raw !== "string") {
        return { ok: false, error: "Название должно быть строкой" };
    }
    const title = raw.trim();
    if (title.length < 1 || title.length > 100) {
        return { ok: false, error: "Название — от 1 до 100 символов без краевых пробелов" };
    }
    return { ok: true, title };
}

// фрагмент validateTaskDraft: результат проверки попадает в errors/value
static validateTaskDraft(draft, tasks, editingId = null) {
    const idResult = FormValidation._checkId(draft, tasks, editingId);
    const titleResult = FormValidation._checkTitle(draft.title);
    const priorityResult = FormValidation._checkPriority(draft.priority);

    const errors = {};
    if (!idResult.ok) errors.id = idResult.error;
    if (!titleResult.ok) errors.title = titleResult.error;
    if (!priorityResult.ok) errors.priority = priorityResult.error;

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors };
    }
    return {
        ok: true,
        value: { id: idResult.id, title: titleResult.title, priority: priorityResult.priority },
    };
}

// kr2/task1-validate-demo.mjs — два проверочных вызова
import { validateTaskDraft } from "../practice-04/src/form-validation.js";
const tasks = [];

const result1 = validateTaskDraft({ id: "20", title: "  Изучить localStorage  ", priority: "high" }, tasks);
console.log("ok:", result1.ok);
console.log("value.title:", JSON.stringify(result1.value.title));

const result2 = validateTaskDraft({ id: "20", title: "   ", priority: "high" }, tasks);
console.log("ok:", result2.ok);
console.log("errors.title:", result2.errors.title);'''

L2 = '''// practice-04/src/task-storage.js — запись JSON
static saveTasks(storage, key, tasks) {
    if (!TaskStorage.isValidTaskList(tasks)) {
        return { ok: false, error: "Список задач некорректен и не был сохранён." };
    }
    try {
        const json = JSON.stringify({ version: STORAGE_VERSION, tasks }); // STORAGE_VERSION = 1
        storage.setItem(key, json);
        return { ok: true };
    } catch (error) {
        return { ok: false, error: `Не удалось сохранить в localStorage: ${error.message}. ...` };
    }
}

// чтение JSON (фрагмент loadTasks)
const fallback = TaskStorage._copy(fallbackTasks);
let raw;
try {
    raw = storage.getItem(key);
} catch (error) {
    return fail(`Не удалось прочитать localStorage: ${error.message}. ...`);
}
if (raw === null) {
    return { ok: true, source: "initial", tasks: fallback };
}
let parsed;
try {
    parsed = JSON.parse(raw);
} catch (error) {
    return fail("Сохранённые данные повреждены (некорректный JSON). ...");
}
if (parsed === null || typeof parsed !== "object" || parsed.version !== STORAGE_VERSION) {
    return fail("Неизвестная версия сохранённых данных. ...");
}
if (!TaskStorage.isValidTaskList(parsed.tasks)) {
    return fail("Сохранённые задачи не соответствуют схеме. ...");
}
return { ok: true, source: "storage", tasks: TaskStorage._copy(parsed.tasks) };

// practice-04/src/main.js — места вызова
const storageKey = isCheckRun
    ? `tip-js-practice-04:checks:${datasetName}`
    : `tip-js-practice-04:${datasetName}`;           // для общего набора: tip-js-practice-04:demo

// при запуске (App.load):
loaded = loadTasks(this.storage, this.storageKey, this.initialTasks);
this.currentTasks = loaded.tasks;
if (loaded.source === "storage") {
    status.textContent = "Данные восстановлены из localStorage.";
}

// после каждой успешной операции (App.persistCurrentTasks):
const saved = saveTasks(this.storage, this.storageKey, this.currentTasks);

// в handleFormSubmit после успешного addTask/updateTask:
this.currentTasks = result.tasks;
this.setFormMode(null);
this.persistCurrentTasks(isEditing ? `Задача ${id} изменена.` : `Задача ${id} добавлена.`);'''

L3 = '''// practice-05/src/task-api.js — метод getTasks
async getTasks(filters = {}) {
    const query = TaskApi._normalizeFilters(filters);   // только completed/priority/categoryId/q
    const payload = await this.client.requestJson("/tasks", { query });
    return TaskApi._checkTaskCollection(payload);       // схема задач, уникальность id, meta.total
}

// practice-05/src/api-client.js — фильтры уходят в query-параметры (buildUrl)
for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(name, String(value));          // false сохраняется как "false"
}

// kr2/task3-get-tasks-demo.mjs — настройка клиента и проверочный вызов
import { createApiClient } from "../practice-05/src/api-client.js";
import { createTaskApi } from "../practice-05/src/task-api.js";

const client = createApiClient({ baseUrl: "http://127.0.0.1:5505/api", timeoutMs: 2000 });
const api = createTaskApi(client);

const { tasks, meta } = await api.getTasks({ completed: false, priority: "high" });
console.log("Запрос: GET /api/tasks?completed=false&priority=high");
console.log("id:", JSON.stringify(tasks.map((task) => task.id)));
console.log("meta.total:", meta.total);'''

L4 = '''// practice-05/src/api-client.js — фрагмент requestJson: проверка HTTP-статуса
if (!(response instanceof Response)) {
    throw new ApiError("fetch вернул не объект Response.", { kind: "invalid-response", url });
}
// fetch не отклоняет Promise на 404/503 — сервер ответил,
// поэтому статус проверяем явно и раньше разбора тела.
if (!response.ok) {
    throw await this._createHttpError(response, url);
}

async _createHttpError(response, url) {
    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        // Тело не JSON — остаётся только статус.
    }
    const apiError = payload?.error;
    const message = typeof apiError?.message === "string" && apiError.message !== ""
        ? apiError.message
        : `HTTP-ошибка ${response.status}`;
    return new ApiError(message, {
        kind: "http",
        status: response.status,
        code: apiError?.code ?? null,
        details: apiError?.details ?? null,
        url,
    });
}

// kr2/task4-http-error-demo.mjs — вызов getTaskById(999) с перехватом ошибки
try {
    const task = await api.getTaskById(999);
    console.log("Неожиданно получена задача:", task);
} catch (error) {
    if (!(error instanceof ApiError)) throw error;
    console.log("kind:", error.kind);
    console.log("status:", error.status);
    console.log("code:", error.code);
    console.log("message:", error.message);
}
console.log("Скрипт завершён без необработанного исключения.");'''

L5 = '''// practice-06/src/app-controller.js — toggleTask
toggleTask = async (id) => {
    const task = this._findTask(id);
    if (task === undefined) {
        this.view.notify("Задача не найдена в текущем списке. Обновите список.", "error");
        return false;
    }
    const completed = !task.completed;
    return this._mutate(
        () => this.api.setTaskCompleted(id, completed),
        completed ? `Задача № ${id} выполнена.` : `Задача № ${id} возвращена в работу.`,
    );
};

// общая схема мутации: PATCH → сообщение → повторная загрузка
_mutate = async (operation, successMessage) => {
    this.view.setMutationPending(true);
    try {
        await operation();
        this.view.notify(successMessage, "success");
        await this._loadCurrentTasks();
        return true;
    } catch (error) {
        this.view.notify(messageForError(error), "error");
        return false;
    } finally {
        this.view.setMutationPending(false);
    }
};

// practice-06/src/task-api.js — отправка PATCH
async setTaskCompleted(id, completed, options = {}) {
    if (typeof completed !== "boolean") throw new TypeError("completed — true или false");
    return this.updateTask(id, { completed }, options);
}

async updateTask(id, changes, options = {}) {
    TaskApi._checkId(id);
    const payload = await this.client.requestJson(`/tasks/${id}`, TaskApi._withSignal({
        method: "PATCH",
        body: changes,                     // { completed: true }
    }, options));
    return TaskApi._taskFrom(payload, `PATCH /tasks/${id}`);
}

// practice-06/src/api-client.js — тело запроса
if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
}

// app-controller.js — повторная загрузка с текущими фильтрами (фрагмент _loadCurrentTasks)
_loadCurrentTasks = async () => {
    this.loadController?.abort();                 // предыдущий запрос отменяется
    const controller = new AbortController();
    this.loadController = controller;
    const loadId = ++this.loadId;
    const options = { signal: controller.signal };
    const filters = { ...this.filters };          // { completed: false }

    this.view.setListState("loading");
    try {
        // ... (первая загрузка вместе с категориями — loadInitialData)
        const result = await this.api.getTasks(filters, options);   // GET /api/tasks?completed=false
        if (loadId !== this.loadId) return;       // устаревший ответ не применяется
        ({ tasks, meta } = result);

        this.tasks = tasks;
        this.view.setTasks(tasks, this.categories);
        this.view.setTotal(meta?.total ?? tasks.length);
        this.view.setListState(tasks.length > 0 ? "ready" : "empty");
    } catch (error) {
        // ...
    }
};'''

SHOTS = [
    ("task1-validate.png", "Скриншот 1. Результаты обоих вызовов validateTaskDraft:",
     'Вызов 1 — title = "  Изучить localStorage  " → ok: true, value.title = "Изучить localStorage" (краевые пробелы удалены). '
     'Вызов 2 — title = "   " → ok: false, errors.title = «Название — от 1 до 100 символов без краевых пробелов».'),
    ("task2-localstorage.png", "Скриншот 2. Задача 20 и запись хранилища после перезагрузки:",
     "После сброса, фильтра «Все», добавления задачи 20 «Изучить localStorage» (high) и перезагрузки страницы задача осталась в списке "
     "с приоритетом «Высокий»; в DevTools → Application → Local storage ключ tip-js-practice-04:demo содержит {\"version\":1,\"tasks\":[…]}."),
    ("task3-get-tasks.png", "Скриншот 3. Результат запроса getTasks с серверными фильтрами:",
     "GET /api/tasks?completed=false&priority=high → id [4, 13, 34], meta.total = 3."),
    ("task4-http-error.png", "Скриншот 4. Результат getTaskById(999):",
     "Ошибка перехвачена в try/catch: kind: \"http\", status: 404, code: TASK_NOT_FOUND; необработанного исключения нет."),
    ("task5-network.png", "Скриншот 5. Список и панель Network после отметки задачи 4:",
     "Активен фильтр «Статус: В работе» (completed=false), сообщение «Задача № 4 выполнена.», задача 4 исчезла из выборки. "
     "В Network: PATCH /api/tasks/4 — 200 OK, затем GET /api/tasks?completed=false — 200 OK (блок General этого запроса — во врезке внизу)."),
]

EXPLAIN4 = ("Пояснение. fetch отклоняет Promise только при сетевом сбое, а ответ 404 или 503 для него — "
            "успешно полученный Response, поэтому без явной проверки response.ok клиент принял бы тело ошибки "
            "за данные задачи.")
