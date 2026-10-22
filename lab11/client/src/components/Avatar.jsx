const COLORS = ['#2563eb', '#db2777', '#9333ea', '#0d9488', '#ea580c', '#4f46e5'];

/** Кружок с инициалами; цвет вычисляется из имени, чтобы у одного исполнителя он был всегда одинаковым. */
export default function Avatar({ name, size = 30 }) {
    if (!name) return null;
    const initials = name.replace(/\./g, '').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const color = COLORS[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % COLORS.length];
    return (
        <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }} title={name}>
            {initials}
        </span>
    );
}
