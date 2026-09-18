// Клиент к Python-сервису правил.
//
// Сервис — источник истины: он умеет разбирать даты и знает про препараты,
// меняющие тактику. Но на бесплатном хостинге он засыпает, и первый запрос
// после сна идёт полминуты. Поэтому любой сбой или таймаут означает откат
// на локальные JS-правила: карточка станет беднее, но врач её получит.
import { classify as classifyLocally, parsePain } from './triage.js';
import { normalizeUrl } from './url.js';

const RULES_URL = normalizeUrl(process.env.RULES_URL);
const TIMEOUT_MS = Number(process.env.RULES_TIMEOUT_MS || 4000);
// Бесплатный инстанс просыпается около полуминуты. Четыре секунды — верный
// таймаут для живого сервиса, но на холодном старте из-за него первый
// пациент получал бы деградированный разбор. Поэтому одна длинная повторная
// попытка; чтобы она не превращалась в наказание, когда сервис действительно
// лежит, после неудачи её не повторяем целую минуту.
const WAKE_TIMEOUT_MS = Number(process.env.RULES_WAKE_TIMEOUT_MS || 25000);
const COOLDOWN_MS = 60000;

let lastError = null;
let coldUntil = 0;

export function rulesStatus() {
  return {
    configured: Boolean(RULES_URL),
    url: RULES_URL || null,
    lastError,
    coolingDown: Date.now() < coldUntil,
  };
}

// Первая попытка — короткая. Если не вышло и мы не в периоде остывания,
// вторая с запасом: скорее всего сервис в этот момент как раз просыпается.
async function callWithWake(path, payload) {
  try {
    const result = await callRules(path, payload, TIMEOUT_MS);
    coldUntil = 0;
    return result;
  } catch (first) {
    if (Date.now() < coldUntil) throw first;
    try {
      const result = await callRules(path, payload, WAKE_TIMEOUT_MS);
      coldUntil = 0;
      return result;
    } catch (second) {
      coldUntil = Date.now() + COOLDOWN_MS;
      throw second;
    }
  }
}

async function callRules(path, payload, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(RULES_URL + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`rules ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function fallbackVerdict(answers, why) {
  const local = classifyLocally(answers);
  return {
    urgency: local.urgency,
    redFlags: local.redFlags,
    substances: [],
    reason: local.reason,
    pain: parsePain(answers.pain),
    durationDays: null,
    durationNote: String(answers.duration || 'не указана'),
    durationConfident: false,
    needsClarification: ['Сервис правил недоступен — разбор длительности упрощён.'],
    engine: 'js-fallback',
    engineNote: why,
  };
}

export async function classify(answers) {
  if (!RULES_URL) return fallbackVerdict(answers, 'RULES_URL не задан');
  try {
    const data = await callWithWake('/classify', answers);
    lastError = null;
    return {
      urgency: data.urgency,
      redFlags: data.red_flags || [],
      substances: data.substances || [],
      reason: data.reason,
      pain: data.pain,
      durationDays: data.duration_days,
      durationNote: data.duration_note,
      durationConfident: data.duration_confident,
      needsClarification: data.needs_clarification || [],
      engine: 'python',
      engineNote: null,
    };
  } catch (err) {
    lastError = String(err.message || err);
    return fallbackVerdict(answers, lastError);
  }
}

// Сводка по очереди. Здесь откат проще: считаем то же самое на месте.
export async function analytics(cards) {
  if (RULES_URL) {
    try {
      const data = await callWithWake('/analytics', { cards });
      return { ...data, engine: 'python' };
    } catch (err) {
      lastError = String(err.message || err);
    }
  }
  return { ...localAnalytics(cards), engine: 'js-fallback' };
}

const ORDER = [
  ['emergency', 'Неотложно'],
  ['today', 'Сегодня'],
  ['planned', 'Плановый приём'],
  ['selfcare', 'Самопомощь'],
];

function localAnalytics(cards) {
  const counts = new Map();
  const flags = new Map();
  const pains = [];
  for (const card of cards) {
    const code = card.urgency?.code || 'selfcare';
    counts.set(code, (counts.get(code) || 0) + 1);
    for (const flag of card.redFlags || []) flags.set(flag, (flags.get(flag) || 0) + 1);
    if (typeof card.painLevel === 'number') pains.push(card.painLevel);
  }
  return {
    total: cards.length,
    byUrgency: ORDER.map(([code, label]) => ({ code, label, count: counts.get(code) || 0 })),
    topRedFlags: [...flags.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([flag, count]) => ({ flag, count })),
    avgPain: pains.length ? Math.round((pains.reduce((a, b) => a + b, 0) / pains.length) * 10) / 10 : null,
    needsClarification: cards.filter((c) => c.needsClarification?.length).length,
    emergencyShare: cards.length ? Math.round((100 * (counts.get('emergency') || 0)) / cards.length) : 0,
  };
}
