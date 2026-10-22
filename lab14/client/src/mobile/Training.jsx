// «Инструкции»: обучающие материалы по охране труда (видео и документы)
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorAlert, Loading, useApi } from '../components/ui';
import { fmtDuration, fmtSize } from '../utils';
import { MHeader } from './MobileLayout';

export function Training() {
  const [kind, setKind] = useState('');
  const list = useApi(() => api.get(`/training${kind ? `?kind=${kind}` : ''}`), [kind]);
  return (
    <div>
      <MHeader title="Инструкции" />
      <div className="m-body">
        <div className="m-tabs pill mb-3">
          {[['', 'Все'], ['video', 'Видео'], ['document', 'Документы']].map(([k, l]) => (
            <button key={k} type="button" className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
        <ErrorAlert error={list.error} />
        {!list.data ? <Loading /> : list.data.length ? list.data.map((m) => (
          <Link key={m.id} to={`/m/training/${m.id}`} className="m-material">
            <span className="thumb"><img src={m.image} alt="" />{m.kind === 'video' && <i className="bi bi-play-circle-fill play" />}</span>
            <span className="flex-grow-1">
              <span className="d-block fw-semibold small">{m.title}</span>
              <span className="d-block small text-secondary text-truncate-2">{m.description}</span>
              <span className="d-block small mt-1 text-primary">
                <i className={`bi ${m.kind === 'video' ? 'bi-camera-reels' : 'bi-file-earmark-text'} me-1`} />
                {m.kind === 'video' ? `Видео · ${fmtDuration(m.duration_sec)}` : `Документ · ${fmtSize(m.file_size_kb)}`}
              </span>
            </span>
          </Link>
        )) : <Empty text="Материалов нет" />}
      </div>
    </div>
  );
}

export function TrainingItem() {
  const { id } = useParams();
  const m = useApi(() => api.get(`/training/${id}`), [id]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!playing || !m.data) return undefined;
    // демонстрационное воспроизведение: шкала прогресса по длительности ролика (ускоренно)
    const t = setInterval(() => setProgress((p) => {
      if (p >= m.data.duration_sec) { setPlaying(false); return p; }
      return p + 5;
    }), 250);
    return () => clearInterval(t);
  }, [playing, m.data]);
  const d = m.data;
  return (
    <div>
      <MHeader title={d?.kind === 'document' ? 'Документ' : 'Видеоинструкция'} />
      <div className="m-body">
        <ErrorAlert error={m.error} />
        {!d ? <Loading /> : (
          <>
            <div className="m-player">
              <img src={d.image} alt="" />
              {d.kind === 'video' && (
                <>
                  <button type="button" className="play-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Пауза' : 'Воспроизвести'}>
                    <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                  </button>
                  <div className="bar"><div style={{ width: `${(Math.min(progress, d.duration_sec) / d.duration_sec) * 100}%` }} /></div>
                  <span className="time">{fmtDuration(Math.min(progress, d.duration_sec))} / {fmtDuration(d.duration_sec)}</span>
                </>
              )}
            </div>
            <h2 className="h5 mt-3">{d.title}</h2>
            <div className="small text-secondary mb-2">{d.topic} · {d.kind === 'video' ? `видео, ${fmtDuration(d.duration_sec)}` : `документ, ${fmtSize(d.file_size_kb)}`}</div>
            <p className="small">{d.description}</p>
            <div className="m-card small content">{d.content.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}</div>
          </>
        )}
      </div>
    </div>
  );
}
