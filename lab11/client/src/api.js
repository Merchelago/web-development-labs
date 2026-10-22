// Обёртка над fetch для REST API «Список задач»

export class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

async function request(path, { method = 'GET', body, signal } = {}) {
    let res;
    try {
        res = await fetch(`/api${path}`, {
            method,
            signal,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        throw new ApiError(0, 'Сервер API недоступен. Проверьте, что он запущен (npm start).');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const message = data?.error ?? (res.status >= 500 ? 'Сервер API недоступен' : `Ошибка ${res.status}`);
        throw new ApiError(res.status, message, data?.details);
    }
    return data;
}

const qs = params => {
    const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)).toString();
    return s ? `?${s}` : '';
};

export const api = {
    tasks: (params, signal) => request(`/tasks${qs(params)}`, { signal }),
    stats: () => request('/tasks/stats'),
    createTask: data => request('/tasks', { method: 'POST', body: data }),
    updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: data }),
    setStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
    deleteTask: id => request(`/tasks/${id}`, { method: 'DELETE' }),
    categories: () => request('/categories'),
    createCategory: data => request('/categories', { method: 'POST', body: data }),
    updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
    deleteCategory: id => request(`/categories/${id}`, { method: 'DELETE' }),
};
