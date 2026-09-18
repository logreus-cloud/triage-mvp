'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CardTable, CopyButton, EmergencyBanner } from '../../components/Card';

async function call(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

export default function Survey() {
  const [log, setLog] = useState([]);
  const [question, setQuestion] = useState(null);
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(true);
  const [value, setValue] = useState('');
  const sessionId = useRef(null);
  const bottom = useRef(null);
  const started = useRef(false);
  const field = useRef(null);

  function say(text, who) {
    setLog((prev) => [...prev, { text, who, id: `${who}-${prev.length}` }]);
  }

  useEffect(() => {
    // В строгом режиме эффект вызывается дважды — без этого флага
    // создавались бы две сессии и первый вопрос дублировался.
    if (started.current) return;
    started.current = true;

    call('/api/session', {})
      .then((data) => {
        sessionId.current = data.sessionId;
        setQuestion(data.question);
        say(data.question.text, 'bot');
        setBusy(false);
      })
      .catch((error) => {
        say(`Не удалось начать опрос. ${error.message}`, 'err');
        setBusy(false);
      });
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [log, card]);

  useEffect(() => {
    // Поле блокируется на время запроса, а disabled сбрасывает фокус —
    // на телефоне это закрывало бы клавиатуру после каждого вопроса.
    if (!busy && !card) field.current?.focus();
  }, [busy, card]);

  async function submit(event) {
    event.preventDefault();
    const text = value.trim();
    if (!text || busy) return;

    say(text, 'me');
    setValue('');
    setBusy(true);

    try {
      const data = await call('/api/answer', { sessionId: sessionId.current, text });
      if (data.done) {
        setCard(data.card);
        setQuestion(null);
      } else {
        setQuestion(data.question);
        say(data.question.text, 'bot');
        setBusy(false);
      }
    } catch (error) {
      say(`Ошибка: ${error.message}`, 'err');
      setBusy(false);
    }
  }

  const progress = question
    ? Math.round(((question.index - 1) / question.total) * 100)
    : 100;

  return (
    <main className="narrow" style={{ paddingTop: 28, paddingBottom: 40 }}>
      {!card && (
        <>
          <h1 style={{ fontSize: '1.6rem' }}>Предварительный опрос</h1>
          <p className="muted small">
            Отвечайте своими словами. Это не диагноз — система готовит карточку,
            которую посмотрит врач.
          </p>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </div>
          {question && (
            <p className="muted small" style={{ marginTop: 8 }}>
              Вопрос {question.index} из {question.total}
            </p>
          )}
        </>
      )}

      {card && (
        <>
          {card.urgency.code === 'emergency' && <EmergencyBanner />}
          <h1 style={{ fontSize: '1.6rem' }}>Карточка готова</h1>
          <p className="muted small">
            Она уже в очереди врача. Можно скопировать текст и отнести на приём.
          </p>
        </>
      )}

      <div className="log">
        {log.map((entry) => (
          <div key={entry.id} className={`bubble ${entry.who}`}>
            {entry.text}
          </div>
        ))}
      </div>

      {card ? (
        <>
          <CardTable card={card} />
          <div className="row" style={{ marginTop: 18 }}>
            <CopyButton card={card} />
            <Link href="/doctor" className="tile" style={{ padding: '11px 16px' }}>
              Открыть экран врача
            </Link>
          </div>
          <p className="muted small" style={{ marginTop: 16 }}>
            Вердикт посчитан движком: {card.engine === 'python' ? 'Python-правила' : 'резервные JS-правила'}.
            Формулировки: {card.source === 'demo' ? 'записанный ответ модели' : card.source}.
          </p>
        </>
      ) : (
        <form className="composer" onSubmit={submit}>
          <input
            ref={field}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              // Не полагаемся на неявную отправку формы: на мобильных
              // клавиатурах «Готово» ведёт себя по-разному в разных браузерах.
              if (event.key === 'Enter') submit(event);
            }}
            placeholder="Ваш ответ"
            autoComplete="off"
            enterKeyHint="send"
            disabled={busy}
            autoFocus
          />
          <button type="submit" disabled={busy || !value.trim()}>
            Ответить
          </button>
        </form>
      )}
      <div ref={bottom} />
    </main>
  );
}
