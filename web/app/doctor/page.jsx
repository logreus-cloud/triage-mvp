'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, CardTable, CopyButton } from '../../components/Card';

export default function Doctor() {
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const key = new URLSearchParams(window.location.search).get('key');
      const suffix = key ? `?key=${encodeURIComponent(key)}` : '';
      const [queueRes, statsRes] = await Promise.all([
        fetch(`/api/queue${suffix}`, { cache: 'no-store' }),
        fetch(`/api/analytics${suffix}`, { cache: 'no-store' }),
      ]);
      const queue = await queueRes.json();
      if (!queueRes.ok) throw new Error(queue.error || 'Очередь недоступна');
      setCards(queue.cards || []);
      setStats(statsRes.ok ? await statsRes.json() : null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <main className="wrap" style={{ padding: 'clamp(32px, 5vw, 64px) 0' }}>
      <div className="row">
        <div>
          <span className="eyebrow">Экран врача</span>
          <h1 style={{ marginTop: 16, fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>Очередь пациентов</h1>
        </div>
        <span className="spacer" />
        <button type="button" className="btn light" onClick={load}>Обновить</button>
      </div>

      {error && <div className="warn" style={{ marginTop: 26 }}>{error}</div>}

      {stats && stats.total > 0 && (
        <div className="stats" style={{ marginTop: 34 }}>
          {stats.byUrgency.map((row) => (
            <div key={row.code} className="stat">
              <b style={{ color: `var(--${row.code})` }}>{row.count}</b>
              <span>{row.label}</span>
            </div>
          ))}
          <div className="stat">
            <b>{stats.avgPain ?? '—'}</b>
            <span>средняя боль</span>
          </div>
          {stats.needsClarification > 0 && (
            <div className="stat">
              <b>{stats.needsClarification}</b>
              <span>требуют уточнения</span>
            </div>
          )}
        </div>
      )}

      {loading && <p className="muted" style={{ marginTop: 30 }}>Загрузка…</p>}

      {!loading && !cards.length && !error && (
        <p className="muted" style={{ marginTop: 34 }}>
          Пока никто не завершил опрос.
        </p>
      )}

      <div style={{ marginTop: 40 }}>
        {cards.map((card) => (
          <article key={card.id} className="queue-row">
            <div className={`rule ${card.urgency.code}`}>
              <div className="row">
                <Badge urgency={card.urgency} />
                <span className="small muted">
                  {new Date(card.createdAt).toLocaleString('ru-RU')}
                </span>
                <span className="spacer" />
                <button
                  type="button"
                  className="btn light"
                  style={{ padding: '10px 18px' }}
                  onClick={() => setOpen(open === card.id ? null : card.id)}
                >
                  {open === card.id ? 'Свернуть' : 'Открыть карточку'}
                </button>
              </div>

              <h3 style={{ margin: '16px 0 6px' }}>{card.complaints || '—'}</h3>
              <p className="small muted" style={{ margin: 0 }}>
                {card.durationNote || card.duration} · боль {card.painLevel ?? '—'} из 10
                {card.redFlags?.length ? ` · ${card.redFlags.join(', ')}` : ''}
              </p>

              {open === card.id && (
                <div style={{ marginTop: 26, maxWidth: 760 }}>
                  <CardTable card={card} />
                  <div className="row" style={{ marginTop: 20 }}>
                    <CopyButton card={card} />
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {stats?.engine === 'js-fallback' && cards.length > 0 && (
        <p className="small muted" style={{ marginTop: 26 }}>
          Сводка посчитана резервным движком — сервис правил сейчас недоступен.
        </p>
      )}
    </main>
  );
}
