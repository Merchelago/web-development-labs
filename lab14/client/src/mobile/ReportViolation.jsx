// «Сообщить о нарушении»: фото, тип, зона, комментарий → POST /api/violations (multipart) → журнал веб-версии
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../components/ui';
import { MHeader } from './MobileLayout';

export default function ReportViolation() {
  const lookups = useApi(() => api.get('/lookups'), []);
  const [form, setForm] = useState({ type_id: '', facility_id: '', description: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!photo) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!photo) errs.photo = 'Прикрепите фотографию нарушения';
    if (!form.type_id) errs.type_id = 'Выберите тип нарушения';
    if (!form.facility_id) errs.facility_id = 'Выберите место (объект или зону)';
    if (form.description.length > 2000) errs.description = 'Комментарий слишком длинный';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const fd = new FormData();
    fd.append('type_id', form.type_id);
    fd.append('facility_id', form.facility_id);
    if (form.description.trim()) fd.append('description', form.description.trim());
    fd.append('photo', photo);
    setBusy(true);
    try {
      setDone(await api.upload('/violations', fd));
    } catch (err) {
      setErrors({ form: err.message, ...(err.details ? Object.fromEntries(err.details.map((d) => [d.field, d.message])) : {}) });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div>
        <MHeader title="Сообщить о нарушении" />
        <div className="m-body text-center pt-5">
          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: 64 }} />
          <h2 className="h5 mt-3">Сообщение отправлено</h2>
          <p className="text-secondary small">Нарушение №{done.id} «{done.type_name}» ({done.facility_name}) зарегистрировано и передано администратору.</p>
          <button type="button" className="btn btn-primary w-100 mb-2" onClick={() => { setDone(null); setForm({ type_id: '', facility_id: '', description: '' }); setPhoto(null); }}>Сообщить ещё</button>
          <Link to="/m" className="btn btn-light w-100">На главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MHeader title="Сообщить о нарушении" />
      <form className="m-body" onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert-danger py-2 small">{errors.form}</div>}
        <div className="m-photo-row">
          <div className="m-photo-preview">{preview ? <img src={preview} alt="Фото нарушения" /> : <i className="bi bi-image text-secondary fs-3" />}</div>
          <label className={`m-photo-pick ${errors.photo ? 'invalid' : ''}`}>
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { setPhoto(e.target.files[0] || null); setErrors(({ photo, ...rest }) => rest); }} data-testid="photo-input" />
            <span className="cam-ic"><i className="bi bi-camera-fill" /></span>
            <span className="fw-semibold small">Сделать фото</span><span className="small text-secondary">или выбрать из галереи</span>
          </label>
        </div>
        {errors.photo && <div className="invalid-feedback d-block mb-2">{errors.photo}</div>}
        <label className="form-label small fw-semibold mt-2" htmlFor="vtype">Тип нарушения</label>
        <select id="vtype" className={`form-select ${errors.type_id ? 'is-invalid' : ''}`} value={form.type_id} onChange={(e) => { setForm({ ...form, type_id: e.target.value }); setErrors(({ type_id, ...rest }) => rest); }}>
          <option value="">Выберите тип</option>
          {lookups.data?.violationTypes.map((t) => <option key={t.id} value={t.id}>{t.code === 'no_helmet' ? 'Отсутствует каска' : t.code === 'no_vest' ? 'Нет сигнального жилета' : t.code === 'no_glasses' ? 'Нет защитных очков' : t.code === 'danger_zone' ? 'Нахождение в опасной зоне' : 'Другое нарушение'}</option>)}
        </select>
        <div className="invalid-feedback">{errors.type_id}</div>
        <label className="form-label small fw-semibold mt-3" htmlFor="vfac">Локация</label>
        <select id="vfac" className={`form-select ${errors.facility_id ? 'is-invalid' : ''}`} value={form.facility_id} onChange={(e) => { setForm({ ...form, facility_id: e.target.value }); setErrors(({ facility_id, ...rest }) => rest); }}>
          <option value="">Выберите объект или зону</option>
          {lookups.data?.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <div className="invalid-feedback">{errors.facility_id}</div>
        <label className="form-label small fw-semibold mt-3" htmlFor="vcom">Комментарий (необязательно)</label>
        <textarea id="vcom" className={`form-control ${errors.description ? 'is-invalid' : ''}`} rows={3} value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Опишите, что произошло" />
        <div className="invalid-feedback">{errors.description}</div>
        <button type="submit" className="btn btn-primary w-100 mt-4 py-2" disabled={busy}>{busy && <span className="spinner-border spinner-border-sm me-2" />}Отправить</button>
      </form>
    </div>
  );
}
