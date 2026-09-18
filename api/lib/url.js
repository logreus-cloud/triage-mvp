// Render подставляет адреса соседних сервисов через fromService, и отдаёт их
// БЕЗ схемы. Причём вариантов два, и они требуют разных схем:
//
//   hostport для внутренней сети -> «triage-rules:10000»   -> http, домена нет
//   публичный адрес              -> «triage-api.onrender.com» -> https
//
// Различаем по точке в имени хоста: внутренние имена Render — одно слово.
// Ошибка здесь тихая: api просто ушёл бы на резервные JS-правила.
export function normalizeUrl(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const host = value.split(':')[0];
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(host);
  const isInternal = !host.includes('.');

  if (isLocal || isInternal) return `http://${value}`;
  // Порт 443 в https-URL избыточен и только мешает читать логи.
  return `https://${value.replace(/:443$/, '')}`;
}
