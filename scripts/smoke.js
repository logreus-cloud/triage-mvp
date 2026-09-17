// Проходит сценарий целиком по HTTP: опрос -> карточка -> очередь врача.
const base = process.env.BASE_URL || 'http://localhost:3000';

const CASES = [
  { name: 'неотложно', answers: ['давит за грудиной', '40 минут', '8', 'боль в груди, одышка', 'нет', 'гипертония', 'лозартан'], expect: 'emergency' },
  { name: 'плановый', answers: ['ноет поясница', '3 недели', '4', 'нет', 'нет', 'нет', 'нет'], expect: 'planned' },
  { name: 'самопомощь', answers: ['лёгкий насморк', '2 дня', '0', 'нет', 'нет', 'нет', 'нет'], expect: 'selfcare' },
  // Регрессия: «поНЕДЕЛьник» не должен читаться как «неделя».
  { name: 'дата вместо длительности', answers: ['головная боль', 'в понедельник 11-го октября', '2', 'нет', 'нет', 'нет', 'нет'], expect: 'selfcare' },
];

async function post(path, body) {
  const res = await fetch(base + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

let failed = 0;
for (const testCase of CASES) {
  const { sessionId } = await post('/api/session', {});
  let last;
  for (const text of testCase.answers) last = await post('/api/answer', { sessionId, text });
  if (!last.done) { console.error(`✗ ${testCase.name}: опрос не завершился`); failed++; continue; }
  const card = last.card;
  const ok = card.urgency.code === testCase.expect && card.draft && card.complaints;
  console.log(`${ok ? '✓' : '✗'} ${testCase.name}: ${card.urgency.label} (ждали ${testCase.expect}), источник=${card.source}`);
  if (!ok) failed++;
}

const queue = await (await fetch(base + '/api/queue')).json();
const order = queue.cards.map((c) => c.urgency.code);
const sorted = [...queue.cards].every((c, i, arr) => i === 0 || arr[i - 1].urgency.rank <= c.urgency.rank);
console.log(`${sorted ? '✓' : '✗'} очередь отсортирована: ${order.join(' → ')}`);
if (!sorted) failed++;

console.log(failed ? `\n${failed} проверок упало` : '\nвсё зелёное');
process.exit(failed ? 1 : 0);
