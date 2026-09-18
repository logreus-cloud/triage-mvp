// Наполняет очередь врача, чтобы демонстрация не начиналась с пустого экрана.
//   BASE_URL=https://triage-web.onrender.com npm run seed
import { BASE, post } from './_base.js';

const PATIENTS = [
  ['давит за грудиной, отдаёт в руку', 'минут двадцать назад', '9', 'боль в груди, одышка', 'нет', 'гипертония', 'лозартан'],
  ['температура и сильная слабость', 'вторые сутки', '4', 'температура 38.9', 'нет', 'нет', 'парацетамол'],
  ['ноет поясница после огорода', 'недели две', '5', 'нет', 'нет', 'нет', 'нет'],
  ['заложен нос, першит в горле', '3 дня', '1', 'нет', 'пенициллин', 'нет', 'нет'],
];

console.log(`цель: ${BASE}`);
for (const answers of PATIENTS) {
  const { sessionId } = await post('/api/session', {});
  let last;
  for (const text of answers) last = await post('/api/answer', { sessionId, text });
  const card = last.card;
  console.log(`+ ${card.urgency.label.padEnd(16)} ${card.complaints}`);
}
console.log(`\nготово: ${PATIENTS.length} карточек в очереди`);
