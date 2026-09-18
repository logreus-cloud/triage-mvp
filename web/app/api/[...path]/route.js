// Серверный прокси к Node-API.
//
// Браузер ходит на свой же origin, поэтому нет CORS, адрес бэкенда не виден
// в исходниках страницы, а на Render фронтенд и API остаются независимыми
// сервисами — меняется одна переменная окружения, а не код.

// Render подставляет адрес соседнего сервиса без схемы, причём во внутренней
// сети это «triage-api:10000» (http, без домена), а публично —
// «triage-api.onrender.com» (https). Различаем по точке в имени хоста.
// Ошибка здесь не тихая: это 502 на каждом запросе.
function normalizeUrl(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return 'http://localhost:3001';
  if (/^https?:\/\//i.test(value)) return value;

  const host = value.split(':')[0];
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(host);
  const isInternal = !host.includes('.');

  if (isLocal || isInternal) return `http://${value}`;
  return `https://${value.replace(/:443$/, '')}`;
}

const API_URL = normalizeUrl(process.env.API_URL);

// Коды, которыми Render отвечает, пока поднимает уснувший сервис.
const WAKING = new Set([502, 503, 504]);
const WAKE_MS = Number(process.env.API_WAKE_TIMEOUT_MS || 50000);
const RETRY_MS = Number(process.env.API_RETRY_DELAY_MS || 3500);

export const dynamic = 'force-dynamic';

async function forward(request, params) {
  const { path } = await params;
  const target = new URL(`${API_URL}/api/${path.join('/')}`);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const init = {
    method: request.method,
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  // Бесплатный инстанс API засыпает примерно на полминуты, и пока Render
  // его поднимает, он отвечает СВОЕЙ страницей 502 — то есть успешным
  // ответом с кодом 502, а не сетевой ошибкой. Ловить только исключения
  // недостаточно: такой ответ прокси честно пересылал посетителю, и первый
  // зашедший видел страницу ошибки Render вместо опроса. Поэтому повторяем
  // и при разрыве связи, и при шлюзовых кодах — с паузами, до дедлайна.
  const deadline = Date.now() + WAKE_MS;
  let lastError = null;
  let lastStatus = null;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(target, init);
      if (!WAKING.has(response.status)) {
        const body = await response.text();
        return new Response(body, {
          status: response.status,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      }
      lastStatus = response.status;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() + RETRY_MS >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }

  // Бэкенд так и не поднялся — говорим это словами и своим JSON,
  // а не чужой страницей ошибки.
  const why = lastError?.message ?? (lastStatus ? `код ${lastStatus}` : 'нет ответа');
  return Response.json(
    { error: `API не отвечает: ${why}. Попробуйте обновить страницу через минуту.` },
    { status: 503 },
  );
}

export async function GET(request, { params }) {
  return forward(request, params);
}

export async function POST(request, { params }) {
  return forward(request, params);
}
