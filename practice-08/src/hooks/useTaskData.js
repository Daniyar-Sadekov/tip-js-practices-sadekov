import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY_SNAPSHOT = { tasks: [], categories: [], meta: { total: 0 } };

// Хук связывает интерфейс с HTTP-API: загружает снимок данных и выполняет изменения.
// api передаётся зависимостью, поэтому хук проверяется без настоящей сети.
export function useTaskData({ api, filters }) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [pending, setPending] = useState(false);
  // Увеличение revision перезапускает эффект загрузки (refresh и GET после мутации).
  const [revision, setRevision] = useState(0);

  // Служебные значения без перерисовки: текущая мутация и признак монтирования.
  const mutationRef = useRef(null);
  const mountedRef = useRef(false);

  // Примитивы вместо объекта filters: новый объект с теми же значениями не перезапустит GET.
  const { q, completed, priority, categoryId } = filters;

  // ── Загрузка ───────────────────────────────────────────────
  useEffect(() => {
    let active = true; // актуален ли именно этот запуск эффекта
    const controller = new AbortController();

    async function load() {
      setStatus('loading');
      setError(null); // старый снимок не очищаем — он остаётся на экране
      try {
        const next = await api.loadInitialData({ q, completed, priority, categoryId }, { signal: controller.signal });
        if (!active) return; // запоздавший успех устаревшего запроса
        setSnapshot(next);
        setStatus('ready');
      } catch (loadError) {
        // Ошибку устаревшего или отменённого нами запроса не показываем.
        if (!active || controller.signal.aborted) return;
        setError(loadError);
        setStatus('error');
      }
    }

    void load();
    return () => {
      active = false;       // сначала запрещаем запись результата,
      controller.abort();   // затем отменяем сам запрос
    };
  }, [api, q, completed, priority, categoryId, revision]);

  // Признак монтирования. В StrictMode setup → cleanup → setup, поэтому true ставится в setup.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      mutationRef.current?.abort(); // при размонтировании отменяем текущую мутацию
    };
  }, []);

  const refresh = useCallback(() => setRevision(previous => previous + 1), []);

  // ── Общая схема мутации ────────────────────────────────────
  const mutate = useCallback(async operation => {
    // Ref проверяется и ставится синхронно, до первого await:
    // второй вызов в том же тике сразу получит false.
    if (!mountedRef.current || mutationRef.current !== null) return false;
    const controller = new AbortController();
    mutationRef.current = controller;
    setPending(true);
    setMutationError(null);
    try {
      await operation(controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return false;
      setRevision(previous => previous + 1); // новый GET с актуальными фильтрами
      return true;
    } catch (mutationFailure) {
      if (mountedRef.current && !controller.signal.aborted) setMutationError(mutationFailure);
      return false;
    } finally {
      // Освобождаем только свою операцию — не затираем ссылку на более новую.
      if (mutationRef.current === controller) mutationRef.current = null;
      if (mountedRef.current) setPending(false);
    }
  }, []);

  const saveTask = useCallback((id, value) => mutate(signal => (
    id === null ? api.createTask(value, { signal }) : api.updateTask(id, value, { signal })
  )), [api, mutate]);

  const toggleTask = useCallback(task => mutate(signal => (
    api.setTaskCompleted(task.id, !task.completed, { signal })
  )), [api, mutate]);

  const deleteTask = useCallback(id => mutate(signal => api.deleteTask(id, { signal })), [api, mutate]);

  const resetData = useCallback(() => mutate(signal => api.resetDemoData({ signal })), [api, mutate]);

  return {
    snapshot, status, error, mutationError, pending,
    refresh, saveTask, toggleTask, deleteTask, resetData,
  };
}
