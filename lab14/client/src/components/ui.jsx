// Общие элементы интерфейса: бейджи, загрузка, ошибки, модальное окно, уведомления-тосты, хук загрузки данных
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PRIORITY, SEVERITY, TASK_STATUS, VIOLATION_STATUS } from '../utils';

export const StatusBadge = ({ status }) => {
  const s = VIOLATION_STATUS[status] || { label: status, cls: 'secondary' };
  return <span className={`badge rounded-pill badge-soft-${s.cls}`}>{s.label}</span>;
};
export const TaskBadge = ({ status }) => {
  const s = TASK_STATUS[status] || { label: status, cls: 'secondary' };
  return <span className={`badge rounded-pill badge-soft-${s.cls}`}>{s.label}</span>;
};
export const SeverityBadge = ({ severity }) => {
  const s = SEVERITY[severity] || SEVERITY.low;
  return (
    <span className={`text-${s.cls} small fw-semibold text-nowrap`}>
      <i className={`bi ${s.icon} me-1`} />{s.label}
    </span>
  );
};
export const PriorityBadge = ({ priority }) => {
  const p = PRIORITY[priority] || PRIORITY.medium;
  return <span className={`badge badge-soft-${p.cls}`}>{p.label}</span>;
};
export const TypeDot = ({ color, name }) => (
  <span className="text-nowrap"><span className="dot me-2" style={{ background: color }} />{name}</span>
);

export const Loading = ({ text = 'Загрузка…' }) => (
  <div className="text-center text-secondary py-5"><div className="spinner-border spinner-border-sm me-2" />{text}</div>
);
export const ErrorAlert = ({ error, onRetry }) => (error ? (
  <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
    <i className="bi bi-exclamation-triangle-fill" /><span className="flex-grow-1">{error.message || String(error)}</span>
    {onRetry && <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>Повторить</button>}
  </div>
) : null);
export const Empty = ({ icon = 'bi-inbox', text = 'Нет данных' }) => (
  <div className="text-center text-secondary py-4"><i className={`bi ${icon} fs-3 d-block mb-1`} />{text}</div>
);

// Загрузка данных с API: { data, error, loading, reload, setData }
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const load = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => id === seq.current && setState({ data, error: null, loading: false }))
      .catch((error) => id === seq.current && setState((s) => ({ ...s, error, loading: false })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function Modal({ title, onClose, children, footer, size = '' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
          <div className="modal-content border-0 shadow">
            <div className="modal-header"><h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Закрыть" onClick={onClose} /></div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, type = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`sv-toast sv-toast-${t.type}`}>
            <i className={`bi ${t.type === 'error' ? 'bi-x-circle-fill' : 'bi-check-circle-fill'} me-2`} />{t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

// Поле формы с выводом ошибки валидации
export const Field = ({ label, error, children, hint }) => (
  <div className="mb-3">
    {label && <label className="form-label small fw-semibold">{label}</label>}
    {children}
    {error ? <div className="invalid-feedback d-block">{error}</div> : hint && <div className="form-text">{hint}</div>}
  </div>
);
