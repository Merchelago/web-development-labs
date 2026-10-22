// Клиент REST API: JWT-токен в заголовке, единая обработка ошибок
const TOKEN_KEY = 'sv_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, url, body, { form = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`/api${url}`, { method, headers, body: form ? body : body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте подключение.');
  }
  if (res.status === 401 && token && url !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event('sv:logout'));
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Ошибка ${res.status}`, data.details);
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
  upload: (url, formData) => request('POST', url, formData, { form: true }),
};

// Скачивание CSV с авторизацией
export async function downloadCsv(url) {
  const res = await fetch(`/api${url}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || 'Не удалось сформировать файл');
  }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'report.csv';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return name;
}

// Строка запроса из объекта (пустые значения пропускаются)
export const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return s ? `?${s}` : '';
};
