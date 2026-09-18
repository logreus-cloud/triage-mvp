// Бесплатные инстансы засыпают после 15 минут простоя, и на демонстрации это
// выглядит как «у них всё сломалось». Будим все три сервиса разом.
//   BASE_URL=https://triage-web.onrender.com RULES_URL=https://triage-rules.onrender.com npm run wake
import { BASE } from './_base.js';

const targets = [
  ['фронтенд и API', `${BASE}/api/health`],
];
if (process.env.RULES_URL) {
  targets.push(['правила', `${process.env.RULES_URL.replace(/\/$/, '')}/health`]);
}

let slowest = 0;
for (const [name, url] of targets) {
  const started = Date.now();
  try {
    const res = await fetch(url);
    const seconds = (Date.now() - started) / 1000;
    slowest = Math.max(slowest, seconds);
    const data = await res.json().catch(() => ({}));
    console.log(`${name.padEnd(16)} ${res.status} за ${seconds.toFixed(1)}s  ${data.commit ? 'commit=' + data.commit : ''}`);
  } catch (error) {
    console.log(`${name.padEnd(16)} недоступен: ${error.message}`);
  }
}

if (slowest > 5) console.log('\nСервисы просыпались. Теперь они прогреты — можно показывать.');
