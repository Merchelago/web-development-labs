// Форматирование ответа curl -i: выводит строку статуса, заголовок Location (если есть) и JSON с отступами.
// Пример: curl -s -i http://localhost:3011/api/tasks/stats | node scripts/pretty.js
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    const sep = input.indexOf('\r\n\r\n');
    const head = sep >= 0 ? input.slice(0, sep).split('\r\n') : [];
    const body = sep >= 0 ? input.slice(sep + 4) : input;
    if (head.length) {
        console.log(head[0]);
        const location = head.find(h => /^location:/i.test(h));
        if (location) console.log(location);
    }
    try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
        console.log(body);
    }
});
