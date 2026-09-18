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

  try {
    const response = await fetch(target, init);
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    // Бэкенд спит или не поднялся — фронтенд должен сказать это словами,
    // а не показать пустой экран.
    return Response.json(
      { error: `API недоступен: ${error.message}` },
      { status: 502 },
    );
  }
}

export async function GET(request, { params }) {
  return forward(request, params);
}

export async function POST(request, { params }) {
  return forward(request, params);
}
