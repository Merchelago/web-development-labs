// Камеры: сетка с кадрами и разметкой, просмотр выбранной камеры, режим управления (статус, расположение)
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import CameraView, { DetectionOverlay } from '../components/CameraView';
import { ErrorAlert, Loading, Modal, useApi, useToast } from '../components/ui';

function CameraManagement({ cameras, onChanged }) {
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const toggle = async (c) => {
    try {
      await api.patch(`/cameras/${c.id}`, { status: c.status === 'online' ? 'offline' : 'online' });
      toast(`${c.name}: ${c.status === 'online' ? 'отключена' : 'включена'}`);
      onChanged();
    } catch (e) { toast(e.message, 'error'); }
  };
  const save = async (e) => {
    e.preventDefault();
    try { await api.patch(`/cameras/${edit.id}`, { name: edit.name, location: edit.location }); toast('Настройки камеры сохранены'); setEdit(null); onChanged(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <div className="card">
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead><tr><th>Камера</th><th>Объект</th><th>Расположение</th><th>Разрешение</th><th>Нарушений сегодня</th><th>Состояние</th><th /></tr></thead>
          <tbody>
            {cameras.map((c) => (
              <tr key={c.id}>
                <td className="fw-semibold">{c.name}</td><td>{c.facility_name}</td><td className="small">{c.location}</td><td className="small">{c.resolution}</td>
                <td>{c.violations_today}</td>
                <td>
                  <div className="form-check form-switch m-0">
                    <input className="form-check-input" type="checkbox" role="switch" checked={c.status === 'online'} onChange={() => toggle(c)} id={`cam${c.id}`} />
                    <label className={`form-check-label small ${c.status === 'online' ? 'text-success' : 'text-danger'}`} htmlFor={`cam${c.id}`}>{c.status === 'online' ? 'Онлайн' : 'Не в сети'}</label>
                  </div>
                </td>
                <td><button type="button" className="btn btn-sm btn-light" onClick={() => setEdit({ ...c })}><i className="bi bi-pencil" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal title={`Настройки: ${edit.name}`} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <label className="form-label small fw-semibold">Название</label>
            <input className="form-control mb-3" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
            <label className="form-label small fw-semibold">Расположение</label>
            <input className="form-control mb-3" value={edit.location || ''} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
            <div className="text-end"><button type="submit" className="btn btn-primary">Сохранить</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function Cameras({ manage = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const list = useApi(() => api.get('/cameras'), []);
  const [selected, setSelected] = useState(location.state?.cameraId || 1);
  const cam = useApi(() => api.get(`/cameras/${selected}`), [selected]);
  const [detCache, setDetCache] = useState({});

  useEffect(() => {
    // разметка для миниатюр (только онлайн-камеры с подготовленными кадрами)
    if (!list.data) return;
    list.data.filter((c) => c.status === 'online' && c.violation_marks > 0).forEach((c) => {
      api.get(`/cameras/${c.id}`).then((d) => setDetCache((s) => ({ ...s, [c.id]: d.detections })));
    });
  }, [list.data]);

  if (list.error) return <ErrorAlert error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loading />;
  const online = list.data.filter((c) => c.status === 'online').length;
  return (
    <div>
      <div className="page-head">
        <h4>{manage ? 'Управление камерами' : 'Камеры наблюдения'}</h4>
        <span className="badge badge-soft-success fs-6">{online} онлайн</span>
        <span className="badge badge-soft-danger fs-6">{list.data.length - online} не в сети</span>
      </div>
      {manage ? <CameraManagement cameras={list.data} onChanged={() => { list.reload(); cam.reload(); }} /> : (
        <div className="row g-3">
          <div className="col-xl-7">
            {cam.data ? <CameraView camera={cam.data} cameras={list.data} onSwitch={setSelected}
              onSelectDetection={(d) => navigate(`/admin/incidents/${d.violation_id}`)} /> : <Loading />}
            {cam.data?.detections.length > 0 && (
              <div className="card mt-3"><div className="card-body">
                <h6>Результаты распознавания на кадре</h6>
                <div className="d-flex flex-wrap gap-2">
                  {cam.data.detections.map((d) => (
                    <button key={d.id} type="button" disabled={!d.violation_id} onClick={() => navigate(`/admin/incidents/${d.violation_id}`)}
                      className={`btn btn-sm ${d.is_violation ? 'btn-outline-danger' : 'btn-outline-success'}`}>
                      {d.label} · {Math.round(d.confidence * 100)}%{d.violation_id ? ` → нарушение #${d.violation_id}` : ''}
                    </button>
                  ))}
                </div>
              </div></div>
            )}
          </div>
          <div className="col-xl-5">
            <div className="row g-2">
              {list.data.map((c) => (
                <div key={c.id} className="col-6">
                  <button type="button" className={`cam-tile ${selected === c.id ? 'active' : ''}`} onClick={() => setSelected(c.id)}>
                    <div className="camera-frame small-frame">
                      {c.status === 'online' ? (<><img src={c.frame} alt="" />{detCache[c.id] && <DetectionOverlay detections={detCache[c.id]} showLabels={false} />}</>)
                        : <div className="camera-offline"><i className="bi bi-camera-video-off" /></div>}
                    </div>
                    <div className="d-flex align-items-center px-2 py-1 small">
                      <span className="fw-semibold me-auto text-truncate">{c.name} · {c.facility_name}</span>
                      <span className={`dot ${c.status === 'online' ? 'bg-success' : 'bg-danger'}`} />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
