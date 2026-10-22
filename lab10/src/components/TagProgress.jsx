/** Кольцевая диаграмма «Прогресс по меткам»: доли меток и общий процент выполнения в центре. */
export default function TagProgress({ items, donePercent, onTagClick }) {
    const total = items.reduce((s, i) => s + i.count, 0) || 1;
    const R = 52;
    const C = 2 * Math.PI * R;
    let offset = 0;
    return (
        <section className="card progress" aria-label="Прогресс по меткам">
            <h2>Прогресс по меткам</h2>
            <div className="progress__body">
                <svg viewBox="0 0 140 140" className="progress__ring" role="img"
                    aria-label={`Выполнено ${donePercent} процентов задач`}>
                    {items.filter(i => i.count).map(item => {
                        const len = (item.count / total) * C;
                        const seg = (
                            <circle key={item.tag} cx="70" cy="70" r={R} fill="none" stroke={item.color} strokeWidth="18"
                                strokeDasharray={`${Math.max(len - 3, 0)} ${C}`} strokeDashoffset={-offset}
                                transform="rotate(-90 70 70)" />
                        );
                        offset += len;
                        return seg;
                    })}
                    <text x="70" y="70" textAnchor="middle" className="progress__value">{donePercent}%</text>
                    <text x="70" y="90" textAnchor="middle" className="progress__caption">Выполнено</text>
                </svg>
                <ul className="progress__legend">
                    {items.map(item => (
                        <li key={item.tag}>
                            <button type="button" onClick={() => onTagClick?.(item.tag)}>
                                <i style={{ background: item.color }} />{item.tag}<b>{item.count}</b>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
