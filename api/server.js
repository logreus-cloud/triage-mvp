import express from 'express';
import { TOTAL } from './lib/script.js';
import { createSession, getSession, currentQuestion, recordAnswer, finishedCards } from './lib/store.js';
import { classify, analytics, rulesStatus } from './lib/rules.js';
import { summarize, DEMO_MODE } from './lib/llm.js';

// Какой коммит сейчас живой. Без этого «доехал ли фикс до прода»
// проверяется догадками — мы уже один раз так попались.
const COMMIT = (
  process.env.RENDER_GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT ||
  'local'
).slice(0, 7);

const app = express();
app.use(express.json({ limit: '64kb' }));

// Фронтенд ходит сюда через свой серверный прокси, но прямой доступ
// из браузера полезен при локальной отладке.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'api',
    commit: COMMIT,
    demoMode: DEMO_MODE,
    questions: TOTAL,
    rules: rulesStatus(),
    uptimeSec: Math.round(process.uptime()),
  });
});

app.post('/api/session', (req, res) => {
  const session = createSession();
  res.json({ sessionId: session.id, question: currentQuestion(session), demoMode: DEMO_MODE });
});

app.post('/api/answer', async (req, res) => {
  const { sessionId, text } = req.body || {};
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена, начните заново.' });
  if (session.card) return res.json({ done: true, card: session.card });

  const answer = String(text ?? '').trim();
  if (!answer) return res.status(400).json({ error: 'Пустой ответ.' });

  recordAnswer(session, answer);

  const next = currentQuestion(session);
  if (next) return res.json({ done: false, question: next });

  session.card = await buildCard(session);
  res.json({ done: true, card: session.card });
});

app.get('/api/session/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена.' });
  res.json({
    sessionId: session.id,
    step: session.step,
    total: TOTAL,
    answers: session.answers,
    question: currentQuestion(session),
    card: session.card,
  });
});

function queue() {
  return finishedCards().sort(
    (a, b) => a.urgency.rank - b.urgency.rank || b.createdAt - a.createdAt,
  );
}

function guard(req, res) {
  const password = process.env.DOCTOR_PASSWORD;
  if (password && req.query.key !== password) {
    res.status(401).json({ error: 'Нужен ключ доступа.' });
    return false;
  }
  return true;
}

app.get('/api/queue', (req, res) => {
  if (!guard(req, res)) return;
  res.json({ cards: queue() });
});

app.get('/api/analytics', async (req, res) => {
  if (!guard(req, res)) return;
  res.json(await analytics(queue()));
});

async function buildCard(session) {
  const a = session.answers;
  // Вердикт и формулировки считаются параллельно: они независимы,
  // а на холодном Python-сервисе последовательность стоила бы лишних секунд.
  const [verdict, summary] = await Promise.all([classify(a), summarize(a)]);

  return {
    id: session.id,
    createdAt: Date.now(),
    complaints: summary.complaints || a.complaint,
    duration: a.duration,
    durationNote: verdict.durationNote,
    durationDays: verdict.durationDays,
    durationConfident: verdict.durationConfident,
    painLevel: verdict.pain,
    allergies: a.allergies,
    chronic: a.chronic,
    meds: a.meds,
    draft: summary.draft,
    redFlags: verdict.redFlags,
    substances: verdict.substances,
    urgency: verdict.urgency,
    reason: verdict.reason,
    needsClarification: verdict.needsClarification,
    engine: verdict.engine,
    source: summary.source,
  };
}

const port = process.env.PORT || 3001;
// Render проверяет здоровье сервиса по внутреннему адресу, поэтому слушать
// нужно 0.0.0.0, а не то, что Node выберет по умолчанию.
app.listen(port, '0.0.0.0', () => {
  console.log(`api :${port}  DEMO_MODE=${DEMO_MODE ? 1 : 0}  commit=${COMMIT}  rules=${rulesStatus().url || 'нет'}`);
});
