/** Кольцевая диаграмма по категориям — данные из stats.by_category. */
export default function CategoryProgress({ items, donePercent, onPick }) {
    const total = items.reduce((s, i) => s + i.total, 0) || 1;
    const R = 52;
    const C = 2 * Math.PI * R;
    let offset = 0;
    return (
        <section className="card progress" aria-label="Прогресс по категориям">
            <h2>Прогресс по категориям</h2>
            <div className="progress__body">
                <svg viewBox="0 0 140 140" className="progress__ring" role="img" aria-label={`Выполнено ${donePercent}%`}>
                    {items.filter(i => i.total).map(i => {
                        const len = (i.total / total) * C;
                        const seg = <circle key={i.id} cx="70" cy="70" r={R} fill="none" stroke={i.color} strokeWidth="18"
                            strokeDasharray={`${Math.max(len - 3, 0)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
                        offset += len;
                        return seg;
                    })}
                    <text x="70" y="70" textAnchor="middle" className="progress__value">{donePercent}%</text>
                    <text x="70" y="90" textAnchor="middle" className="progress__caption">Выполнено</text>
                </svg>
                <ul className="progress__legend">
                    {items.map(i => (
                        <li key={i.id}>
                            <button type="button" onClick={() => onPick(String(i.id))}>
                                <i style={{ background: i.color }} />{i.name}<b>{i.done}/{i.total}</b>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
