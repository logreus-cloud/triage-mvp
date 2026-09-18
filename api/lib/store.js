// US-1: состояние диалога живёт на сервере, у клиента только sessionId.
// In-memory — достаточно для MVP; на Render это один долгоживущий процесс.
import { randomUUID } from 'node:crypto';
import { QUESTIONS, TOTAL } from './script.js';

const sessions = new Map();
const TTL_MS = 6 * 60 * 60 * 1000;

export function createSession() {
  const id = randomUUID();
  const session = {
    id,
    createdAt: Date.now(),
    step: 0,
    answers: {},
    card: null,
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > TTL_MS) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function currentQuestion(session) {
  if (session.step >= TOTAL) return null;
  const q = QUESTIONS[session.step];
  return { index: session.step + 1, total: TOTAL, key: q.key, text: q.text };
}

export function recordAnswer(session, text) {
  const q = QUESTIONS[session.step];
  session.answers[q.key] = text;
  session.step += 1;
}

export function finishedCards() {
  return [...sessions.values()].filter((s) => s.card).map((s) => s.card);
}
