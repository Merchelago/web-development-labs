// Простые валидаторы входных данных. Собирают все ошибки и выбрасывают 400 с перечнем полей.
const { HttpError } = require('./http');

class Validator {
  constructor(data = {}) {
    this.data = data;
    this.errors = [];
    this.out = {};
  }

  _set(field, value) {
    this.out[field] = value;
    return this;
  }

  required(field, label) {
    const v = this.data[field];
    if (v === undefined || v === null || String(v).trim() === '') {
      this.errors.push({ field, message: `Поле «${label}» обязательно` });
    }
    return this;
  }

  string(field, label, { max = 1000, required = false } = {}) {
    if (required) this.required(field, label);
    const v = this.data[field];
    if (v === undefined || v === null || v === '') return this._set(field, v === '' ? null : v);
    const s = String(v).trim();
    if (s.length > max) this.errors.push({ field, message: `Поле «${label}» длиннее ${max} символов` });
    return this._set(field, s);
  }

  int(field, label, { required = false, min } = {}) {
    if (required) this.required(field, label);
    const v = this.data[field];
    if (v === undefined || v === null || v === '') return this._set(field, null);
    const n = Number(v);
    if (!Number.isInteger(n) || (min !== undefined && n < min)) {
      this.errors.push({ field, message: `Поле «${label}» должно быть целым числом` });
      return this;
    }
    return this._set(field, n);
  }

  oneOf(field, label, values, { required = false } = {}) {
    if (required) this.required(field, label);
    const v = this.data[field];
    if (v === undefined || v === null || v === '') return this._set(field, null);
    if (!values.includes(v)) {
      this.errors.push({ field, message: `Недопустимое значение поля «${label}»` });
      return this;
    }
    return this._set(field, v);
  }

  date(field, label, { required = false } = {}) {
    if (required) this.required(field, label);
    const v = this.data[field];
    if (v === undefined || v === null || v === '') return this._set(field, null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v)) || Number.isNaN(Date.parse(v))) {
      this.errors.push({ field, message: `Поле «${label}» должно быть датой в формате ГГГГ-ММ-ДД` });
      return this;
    }
    return this._set(field, v);
  }

  bool(field) {
    const v = this.data[field];
    if (v === undefined || v === null || v === '') return this._set(field, null);
    return this._set(field, v === true || v === 'true' || v === '1' || v === 1);
  }

  email(field, label, { required = false } = {}) {
    this.string(field, label, { max: 120, required });
    const v = this.out[field];
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) this.errors.push({ field, message: `Некорректный адрес в поле «${label}»` });
    return this;
  }

  check() {
    if (this.errors.length) throw new HttpError(400, this.errors[0].message, this.errors);
    return this.out;
  }
}

const validate = (data) => new Validator(data);

// Только переданные поля (для PATCH)
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

module.exports = { validate, pick };
