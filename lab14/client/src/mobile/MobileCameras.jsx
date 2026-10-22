// Просмотр камер в мобильной версии: кадр с результатами распознавания СИЗ, переключение камер, снимок
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { DetectionOverlay } from '../components/CameraView';
import { ErrorAlert, Loading, SeverityBadge, StatusBadge, useApi, useToast } from '../components/ui';
import { fmtDateTime } from '../utils';
import { MHeader } from './MobileLayout';

export default function MobileCameras() {
  const navigate = useNavigate();
  const toast = useToast();
  const list = useApi(() => api.get('/cameras'), []);
  const [id, setId] = useState(1);
  const [boxes, setBoxes] = useState(true);
  const [zoom, setZoom] = useState(false);
  const cam = useApi(() => api.get(`/cameras/${id}`), [id]);
  const snapshot = async () => {
    try { await api.post(`/cameras/${id}/snapshot`); toast('Снимок сохранён'); } catch (e) { toast(e.message, 'error'); }
  };
  const c = cam.data;
  return (
    <div className="m-camera">
      <div className="m-cam-head">
        <button type="button" className="m-back light" onClick={() => navigate(-1)} aria-label="Назад"><i className="bi bi-arrow-left" /></button>
        <div className="text-center flex-grow-1">
          <div className="fw-semibold">{c?.name || 'Камера'}</div>
          {c && <div className={`small ${c.status === 'online' ? 'text-success' : 'text-danger'}`}><span className="dot me-1" style={{ background: 'currentColor' }} />{c.status === 'online' ? 'Онлайн' : 'Не в сети'}</div>}
        </div>
        <button type="button" className="m-back light" onClick={() => setZoom((z) => !z)} aria-label="Режим просмотра" title={zoom ? 'Весь кадр' : 'Крупный план'}><i className={`bi ${zoom ? 'bi-arrows-angle-contract' : 'bi-arrows-angle-expand'}`} /></button>
      </div>
      <div className="m-cam-chips">
        {list.data?.filter((x) => x.status === 'online').map((x) => (
          <button key={x.id} type="button" className={`chip ${x.id === id ? 'active' : ''}`} onClick={() => setId(x.id)}>{x.name} · {x.facility_name}</button>
        ))}
      </div>
      <div className={`m-cam-frame ${zoom ? 'zoom' : ''}`}>
        {!c ? <Loading /> : c.status === 'online' ? (
          <div className={`camera-frame ${zoom ? 'tall' : ''}`}>
            {/* внутренний блок всегда 16:9, поэтому рамки совпадают с кадром и при обрезке «крупного плана» */}
            <div className="frame-inner">
              <img src={c.frame} alt={c.name} />
              {boxes && <DetectionOverlay detections={c.detections} onSelect={(d) => navigate(`/m/violations/${d.violation_id}`)} />}
            </div>
          </div>
        ) : <div className="camera-offline"><i className="bi bi-camera-video-off fs-1" />Нет сигнала</div>}
      </div>
      {c && <div className="m-cam-info small"><i className="bi bi-geo-alt me-1" />{c.facility_name}, {c.location}
        {c.detections?.some((d) => d.is_violation) && <span className="badge bg-danger ms-2">{c.detections.filter((d) => d.is_violation).length} нарушения на кадре</span>}</div>}
      <div className="m-cam-controls">
        <button type="button" className="round" onClick={() => setBoxes((b) => !b)} aria-label="AI-разметка"><i className={`bi ${boxes ? 'bi-bounding-box' : 'bi-square'}`} /></button>
        <button type="button" className="shutter" onClick={snapshot} aria-label="Снимок" />
        <button type="button" className="round" onClick={() => navigate('/m/report')} aria-label="Сообщить о нарушении"><i className="bi bi-exclamation-triangle" /></button>
      </div>
    </div>
  );
}

// Запись журнала нарушений, к которой ведёт рамка на кадре камеры
export function ViolationInfo() {
  const { id } = useParams();
  const v = useApi(() => api.get(`/violations/${id}`), [id]);
  return (
    <div>
      <MHeader title={`Нарушение #${id}`} />
      <div className="m-body">
        <ErrorAlert error={v.error} />
        {!v.data ? <Loading /> : (
          <>
            {v.data.image && <img src={v.data.image} alt="" className="w-100 rounded mb-3" />}
            <h2 className="h6"><span className="dot me-2" style={{ background: v.data.color }} />{v.data.type_name}</h2>
            <div className="d-flex gap-2 mb-2"><StatusBadge status={v.data.status} /><SeverityBadge severity={v.data.severity} /></div>
            <div className="small text-secondary mb-2">{v.data.facility_name}{v.data.camera_name ? `, ${v.data.camera_name}` : ''} · {fmtDateTime(v.data.detected_at)}</div>
            <p className="small">{v.data.description}</p>
            {v.data.tasks.length > 0 && <div className="small"><strong>Задачи:</strong> {v.data.tasks.map((t) => t.title).join('; ')}</div>}
          </>
        )}
      </div>
    </div>
  );
}
