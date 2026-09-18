// Сквозной прогон по всем трём сервисам.
//   npm run smoke
//   BASE_URL=https://triage-web.onrender.com npm run smoke
//
// Бьёт во фронтенд: его прокси идёт в Node-API, тот — в Python-правила.
// Если хоть одно звено легло, это видно здесь, а не на демонстрации.
import { BASE, get, post } from './_base.js';

let failed = 0;

function check(name, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ': ' + detail : ''}`);
  if (!ok) failed++;
  return ok;
}

// Сценарии подобраны так, чтобы каждый закрывал отдельное правило.
const CASES = [
  {
    name: 'неотложно: тревожные признаки',
    answers: ['давит за грудиной', 'минут сорок назад', '8', 'боль в груди и одышка',
      'нет', 'гипертония', 'лозартан'],
    urgency: 'emergency',
    expect: (card) => card.redFlags.length > 0,
  },
  {
    name: 'сегодня: препараты меняют тактику',
    answers: ['ноет голова', '2 дня', '2', 'нет', 'нет', 'нет', 'кокаин'],
    urgency: 'today',
    expect: (card) => card.substances?.includes('стимуляторы'),
  },
  {
    name: 'плановый: длительность разобрана из даты',
    answers: ['ноет поясница', 'с 1 июля', '2', 'нет', 'нет', 'нет', 'нет'],
    urgency: 'planned',
    expect: (card) => card.durationDays > 60,
  },
  {
    name: 'самопомощь: ничего тревожного',
    answers: ['лёгкий насморк', '2 дня', '0', 'нет', 'нет', 'нет', 'нет'],
    urgency: 'selfcare',
    expect: (card) => card.redFlags.length === 0,
  },
  {
    name: 'дата вместо длительности не ломает разбор',
    answers: ['головная боль', 'в понедельник 11-го октября', '2', 'нет', 'нет', 'нет', 'нет'],
    urgency: 'planned',
    expect: (card) => card.needsClarification.length > 0,
  },
];

console.log(`цель: ${BASE}\n`);

const health = await get('/api/health');
check('API отвечает', health.ok === true, `commit=${health.commit}`);
check('включён демо-режим', health.demoMode === true,
  health.demoMode ? 'ключ проверяющему не нужен' : 'ОПАСНО: потребуется наш ключ');

let usedPython = false;

for (const testCase of CASES) {
  const { sessionId } = await post('/api/session', {});
  let last;
  for (const text of testCase.answers) {
    last = await post('/api/answer', { sessionId, text });
  }
  if (!check(`${testCase.name} — диалог дошёл до конца`, last.done)) continue;

  const card = last.card;
  if (card.engine === 'python') usedPython = true;
  const ok = card.urgency.code === testCase.urgency && testCase.expect(card);
  check(
    testCase.name,
    ok,
    `${card.urgency.label} (ждали ${testCase.urgency}), длительность «${card.durationNote}», движок ${card.engine}`,
  );
}

const { cards } = await get('/api/queue');
const sorted = cards.every((card, i) => i === 0 || cards[i - 1].urgency.rank <= card.urgency.rank);
check('очередь отсортирована по срочности', sorted,
  cards.map((c) => c.urgency.code).join(' → '));

const stats = await get('/api/analytics');
check('сводка считается', typeof stats.total === 'number',
  `всего ${stats.total}, движок ${stats.engine}`);

if (!usedPython) {
  console.log('\n! Ни одна карточка не посчитана Python-правилами — работал резервный движок.');
  console.log('  Проверьте RULES_URL и то, что сервис правил проснулся.');
}

console.log(failed ? `\n${failed} проверок упало` : '\nвсё зелёное');
process.exit(failed ? 1 : 0);
