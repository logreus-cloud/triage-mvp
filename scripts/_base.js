export const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function parse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`не JSON (${res.status}): ${text.slice(0, 120)}`);
  }
}

export async function get(path) {
  const res = await fetch(BASE + path);
  const data = await parse(res);
  if (!res.ok) throw new Error(data.error || res.status);
  return data;
}

export async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parse(res);
  if (!res.ok) throw new Error(data.error || res.status);
  return data;
}
