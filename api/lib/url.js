// Render подставляет адреса соседних сервисов через fromService, и отдаёт их
// БЕЗ схемы: «triage-rules.onrender.com:443». fetch такое не принимает, а
// ошибка была бы тихой — api молча ушёл бы на резервные JS-правила.
export function normalizeUrl(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/i.test(value);
  // Порт 443 в https-URL избыточен и только мешает читать логи.
  const host = value.replace(/:443$/, '');
  return `${isLocal ? 'http' : 'https'}://${host}`;
}
