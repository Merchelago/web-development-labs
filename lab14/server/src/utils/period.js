// Разбор периода из параметров запроса: ?period=today|7d|30d|90d или ?from=YYYY-MM-DD&to=YYYY-MM-DD.
// Возвращает границы [from, to) и предыдущий период той же длительности — для расчёта динамики.
const { HttpError } = require('./http');

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parsePeriod(q = {}, def = '7d') {
  let from;
  let to;
  if (q.from || q.to) {
    if (!q.from || !q.to || Number.isNaN(Date.parse(q.from)) || Number.isNaN(Date.parse(q.to))) {
      throw new HttpError(400, 'Укажите обе даты периода в формате ГГГГ-ММ-ДД');
    }
    from = startOfDay(q.from);
    to = new Date(startOfDay(q.to).getTime() + DAY);
    if (to <= from) throw new HttpError(400, 'Дата начала периода должна быть раньше даты окончания');
  } else {
    const period = q.period || def;
    const m = /^(\d+)d$/.exec(period);
    if (period === 'today') {
      from = startOfDay(new Date());
      to = new Date(from.getTime() + DAY);
    } else if (m && Number(m[1]) > 0 && Number(m[1]) <= 366) {
      to = new Date(startOfDay(new Date()).getTime() + DAY);
      from = new Date(to.getTime() - Number(m[1]) * DAY);
    } else {
      throw new HttpError(400, 'Неизвестный период. Допустимо: today, 7d, 30d, 90d');
    }
  }
  const len = to - from;
  return { from, to, prevFrom: new Date(from - len), prevTo: from, days: Math.round(len / DAY) };
}

module.exports = { parsePeriod, startOfDay, DAY };
