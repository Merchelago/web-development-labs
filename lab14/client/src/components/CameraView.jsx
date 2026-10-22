// Просмотр камеры: кадр производственного помещения + рамки результатов распознавания из БД
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useToast } from './ui';

const BOX_COLOR = (d) => {
  if (!d.is_violation) return '#22c55e';
  if (d.label === 'Опасная зона') return '#8b5cf6';
  if (d.label === 'Нет очков!') return '#eab308';
  return '#ef4444';
};

export function DetectionOverlay({ detections = [], onSelect, showLabels = true }) {
  return detections.map((d) => {
    const color = BOX_COLOR(d);
    const below = d.label === 'Нет очков!';
    const inside = !below && Number(d.y) < 0.06;
    return (
      <div
        key={d.id ?? `${d.label}${d.x}`}
        role={d.violation_id && onSelect ? 'button' : undefined}
        tabIndex={d.violation_id && onSelect ? 0 : undefined}
        className={`det-box ${d.violation_id && onSelect ? 'clickable' : ''}`}
        style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${d.w * 100}%`, height: `${d.h * 100}%`, borderColor: color }}
        title={`${d.label} — уверенность ${Math.round(d.confidence * 100)}%${d.violation_id ? ' (открыть нарушение)' : ''}`}
        onClick={(e) => { if (d.violation_id && onSelect) { e.stopPropagation(); onSelect(d); } }}
        onKeyDown={(e) => e.key === 'Enter' && d.violation_id && onSelect?.(d)}
      >
        {showLabels && (
          <span className={`det-label ${below ? 'below' : inside ? 'inside' : ''}`} style={{ background: color }}>
            {d.label}{!d.is_violation && <i className="bi bi-check-lg ms-1" />}
          </span>
        )}
      </div>
    );
  });
}

function useClock(paused) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [paused]);
  return now;
}

export default function CameraView({ camera, cameras, onSwitch, onSelectDetection, onSettings, variant = 'web', fill = false }) {
  const [paused, setPaused] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const ref = useRef(null);
  const toast = useToast();
  const now = useClock(paused);
  if (!camera) return null;
  const online = camera.status === 'online';

  const snapshot = async () => {
    try {
      const m = await api.post(`/cameras/${camera.id}/snapshot`);
      toast(`Снимок сохранён: ${m.original_name}`);
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : ref.current?.requestFullscreen?.());

  return (
    <div className={`camera-view ${variant} ${fill ? 'fill' : ''}`} ref={ref}>
      <div className="camera-head">
        {cameras && onSwitch ? (
          <select className="form-select form-select-sm camera-select" value={camera.id} onChange={(e) => onSwitch(Number(e.target.value))}
            aria-label="Выбор камеры">
            {cameras.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.facility_name}{c.status !== 'online' ? ' (не в сети)' : ''}</option>)}
          </select>
        ) : <span className="fw-semibold">{camera.name} — {camera.facility_name}</span>}
        <span className={`cam-status ${online ? 'on' : 'off'}`}><span className="dot" />{online ? 'Онлайн' : 'Не в сети'}</span>
      </div>
      <div className="camera-frame">
        {online ? (
          <>
            <img src={camera.frame} alt={`Кадр: ${camera.name}`} className={paused ? 'paused' : ''} />
            {showBoxes && <DetectionOverlay detections={camera.detections} onSelect={onSelectDetection} />}
            <span className="cam-clock">{now.toLocaleDateString('ru-RU')} {now.toLocaleTimeString('ru-RU')}</span>
          </>
        ) : (
          <div className="camera-offline"><i className="bi bi-camera-video-off fs-1" /><div>Нет сигнала с камеры</div></div>
        )}
      </div>
      <div className="camera-controls">
        <button type="button" className="icon-btn" onClick={() => setPaused((p) => !p)} title={paused ? 'Продолжить' : 'Пауза'} disabled={!online}>
          <i className={`bi ${paused ? 'bi-play-fill' : 'bi-pause-fill'}`} />
        </button>
        <span className={`live ${paused ? 'muted' : ''}`}><span className="dot" />{paused ? 'Пауза' : 'Live'}</span>
        <span className="small opacity-75 d-none d-md-inline">{camera.location}</span>
        <div className="ms-auto d-flex gap-1">
          <button type="button" className={`icon-btn ${showBoxes ? 'active' : ''}`} onClick={() => setShowBoxes((s) => !s)} title="AI-разметка">
            <i className="bi bi-bounding-box" />
          </button>
          <button type="button" className="icon-btn" onClick={snapshot} title="Сделать снимок" disabled={!online}><i className="bi bi-camera" /></button>
          <button type="button" className="icon-btn" onClick={fullscreen} title="Полноэкранный режим"><i className="bi bi-fullscreen" /></button>
          {onSettings && <button type="button" className="icon-btn" onClick={onSettings} title="Настройки камеры"><i className="bi bi-gear" /></button>}
        </div>
      </div>
    </div>
  );
}
