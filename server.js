import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOTAL } from './lib/script.js';
import { createSession, getSession, currentQuestion, recordAnswer, finishedCards } from './lib/store.js';
import { classify, parsePain } from './lib/triage.js';
import { summarize, DEMO_MODE } from './lib/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, demoMode: DEMO_MODE, questions: TOTAL });
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

// US-4: очередь врача, отсортированная по срочности.
app.get('/api/queue', (req, res) => {
  const password = process.env.DOCTOR_PASSWORD;
  if (password && req.query.key !== password) {
    return res.status(401).json({ error: 'Нужен ключ доступа: /doctor?key=...' });
  }
  const cards = finishedCards().sort(
    (a, b) => a.urgency.rank - b.urgency.rank || b.createdAt - a.createdAt,
  );
  res.json({ cards });
});

async function buildCard(session) {
  const a = session.answers;
  const verdict = classify(a);
  const summary = await summarize(a);

  return {
    id: session.id,
    createdAt: Date.now(),
    // US-2: структурированная карточка
    complaints: summary.complaints || a.complaint,
    duration: a.duration,
    painLevel: parsePain(a.pain),
    allergies: a.allergies,
    chronic: a.chronic,
    meds: a.meds,
    draft: summary.draft,
    // US-3
    redFlags: verdict.redFlags,
    urgency: verdict.urgency,
    reason: verdict.reason,
    source: summary.source,
  };
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`triage-mvp на http://localhost:${port} (DEMO_MODE=${DEMO_MODE ? 1 : 0})`);
});
