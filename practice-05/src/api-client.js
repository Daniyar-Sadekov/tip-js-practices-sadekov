export class ApiError extends Error {
    constructor(message, {
        kind,
        status = null,
        code = null,
        details = null,
        url = null,
        cause,
    } = {}) {
        super(message, cause === undefined ? undefined : { cause });
        this.name = "ApiError";
        this.kind = kind;
        this.status = status;
        this.code = code;
        this.details = details;
        this.url = url;
    }
}

// ═══════════════════════════════════════════════════════
//  ApiClient — общий транспорт: URL → fetch → статус →
//  Content-Type → JSON либо ApiError. Про задачи ничего
//  не знает — маршруты и схема живут в task-api.js.
// ═══════════════════════════════════════════════════════
class ApiClient {

    // ── URL ──────────────────────────────────────────────

    /** Абсолютный http(s)-адрес без query и hash; иначе TypeError. */
    static _parseBaseUrl(baseUrl) {
        if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
            throw new TypeError("baseUrl должен быть непустой строкой");
        }

        let url;
        try {
            url = new URL(baseUrl);
        } catch (error) {
            throw new TypeError(`baseUrl должен быть абсолютным адресом: ${baseUrl}`);
        }

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new TypeError("baseUrl поддерживает только http и https");
        }
        if (url.search !== "" || url.hash !== "") {
            throw new TypeError("baseUrl не должен содержать query и hash");
        }
        return url;
    }

    /**
     * Склеивает baseUrl и path без двойного «/», параметры кодирует
     * URLSearchParams. Пропускаются только undefined/null/"" —
     * false и 0 содержательны (completed=false), поэтому не if (value).
     */
    static buildUrl(baseUrl, path, query = {}) {
        const base = ApiClient._parseBaseUrl(baseUrl);

        if (typeof path !== "string" || path.trim() === "") {
            throw new TypeError("path должен быть непустой строкой");
        }
        if (query === null || typeof query !== "object" || Array.isArray(query)) {
            throw new TypeError("query должен быть обычным объектом");
        }

        const basePath = base.pathname.replace(/\/+$/, "");
        const relative = path.replace(/^\/+/, "");
        const url = new URL(`${basePath}/${relative}`, base.origin);

        for (const [name, value] of Object.entries(query)) {
            if (value === undefined || value === null || value === "") continue;
            url.searchParams.set(name, String(value));
        }
        return url.toString();
    }

    // ── Клиент ───────────────────────────────────────────

    constructor({ baseUrl, fetchFn = globalThis.fetch, timeoutMs = 2000 } = {}) {
        // Проверка конфигурации сразу — ошибка настройки видна при старте,
        // а не при первом запросе.
        ApiClient._parseBaseUrl(baseUrl);
        if (typeof fetchFn !== "function") {
            throw new TypeError("fetchFn должен быть функцией");
        }
        ApiClient._checkTimeout(timeoutMs);

        this.baseUrl = baseUrl;
        // fetch храним в замыкании, а не вызываем как метод объекта:
        // в браузере вызов с чужим this падает с «Illegal invocation».
        this._fetch = (...args) => fetchFn(...args);
        this.timeoutMs = timeoutMs;
    }

    static _checkTimeout(timeoutMs) {
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
            throw new TypeError("timeoutMs — положительное целое число миллисекунд");
        }
    }

    /**
     * Отказ самого fetch: ответа от сервера нет. Отличаем тайм-аут
     * от внешней отмены по тому, какой сигнал сработал.
     */
    _classifyFetchFailure(error, url, timeoutSignal, externalSignal) {
        if (externalSignal?.aborted) {
            return new ApiError("Запрос отменён.", { kind: "aborted", url, cause: error });
        }
        if (timeoutSignal.aborted) {
            return new ApiError("Превышено время ожидания ответа сервера.", { kind: "timeout", url, cause: error });
        }
        return new ApiError("Сервер недоступен: ответ не получен.", { kind: "network", url, cause: error });
    }

    /** Ответ вне 2xx. Поля берём из payload.error, если тело — наш JSON. */
    async _createHttpError(response, url) {
        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            // Тело не JSON (например, HTML от прокси) — остаётся только статус.
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

    async requestJson(path, { query = {}, signal, timeoutMs = this.timeoutMs } = {}) {
        ApiClient._checkTimeout(timeoutMs);
        const url = ApiClient.buildUrl(this.baseUrl, path, query);

        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

        // Отдельный try только вокруг fetch: ApiError, созданная ниже
        // при разборе ответа, не должна превратиться в «network».
        let response;
        try {
            response = await this._fetch(url, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: combinedSignal,
            });
        } catch (error) {
            throw this._classifyFetchFailure(error, url, timeoutSignal, signal);
        }

        if (!(response instanceof Response)) {
            throw new ApiError("fetch вернул не объект Response.", { kind: "invalid-response", url });
        }

        // fetch не отклоняет Promise на 404/503 — сервер ответил,
        // поэтому статус проверяем явно и раньше разбора тела.
        if (!response.ok) {
            throw await this._createHttpError(response, url);
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            throw new ApiError(`Ожидался JSON, получен «${contentType || "без типа"}».`, {
                kind: "invalid-response",
                url,
            });
        }

        try {
            return await response.json();
        } catch (error) {
            throw new ApiError("Сервер вернул повреждённый JSON.", {
                kind: "invalid-response",
                url,
                cause: error,
            });
        }
    }
}

// Создаёт URL относительно baseUrl и добавляет непустые параметры query.
export function buildUrl(baseUrl, path, query = {}) {
    return ApiClient.buildUrl(baseUrl, path, query);
}

// fetchFn передаётся явно, чтобы модуль можно было проверить без реальной сети.
// Возвращаемый объект: { requestJson(path, { query, signal, timeoutMs } = {}) }.
export function createApiClient(options = {}) {
    return new ApiClient(options);
}

export { ApiClient };
