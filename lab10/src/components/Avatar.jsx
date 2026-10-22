/** Кружок с инициалами исполнителя. */
export default function Avatar({ user, size = 30 }) {
    if (!user) return null;
    const initials = user.fullName.split(' ').map(p => p[0]).slice(0, 2).join('');
    return (
        <span className="avatar" style={{ width: size, height: size, background: user.color, fontSize: size * 0.38 }}
            title={user.fullName}>
            {initials}
        </span>
    );
}
