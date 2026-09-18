// Серверный прокси к Node-API.
//
// Браузер ходит на свой же origin, поэтому нет CORS, адрес бэкенда не виден
// в исходниках страницы, а на Render фронтенд и API остаются независимыми
// сервисами — меняется одна переменная окружения, а не код.

const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

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
