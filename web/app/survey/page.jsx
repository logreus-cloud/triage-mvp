'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CardTable, CopyButton, EmergencyBanner } from '../../components/Card';
import { ZONES } from '../../components/BodyMap';

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

function Survey() {
  const params = useSearchParams();
  const [log, setLog] = useState([]);
  const [question, setQuestion] = useState(null);
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(true);
  const [value, setValue] = useState('');
  const sessionId = useRef(null);
  const started = useRef(false);
  const field = useRef(null);
  const bottom = useRef(null);

  function say(text, who) {
    setLog((prev) => [...prev, { text, who, id: `${who}-${prev.length}` }]);
  }

  useEffect(() => {
    // В строгом режиме эффект вызывается дважды — без флага создавались бы
    // две сессии и первый вопрос дублировался.
    if (started.current) return;
    started.current = true;

    call('/api/session', {})
      .then((data) => {
        sessionId.current = data.sessionId;
        setQuestion(data.question);
        say(data.question.text, 'bot');
        setBusy(false);

        // Зона, выбранная на модели, становится началом первого ответа —
        // пациенту остаётся дописать характер боли, а не начинать с нуля.
        const zone = ZONES.find((z) => z.id === params.get('zone'));
        if (zone) setValue(`Болит: ${zone.label.toLowerCase()}. `);
      })
      .catch((error) => {
        say(`Не удалось начать опрос. ${error.message}`, 'err');
        setBusy(false);
      });
  }, [params]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [log, card]);

  useEffect(() => {
    // disabled сбрасывает фокус, а на телефоне это закрывает клавиатуру
    // после каждого вопроса.
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

  const total = question?.total ?? 7;
  const done = question ? question.index - 1 : total;

  if (card) {
    return (
      <main className="narrow" style={{ padding: 'clamp(32px, 5vw, 64px) 0' }}>
        {card.urgency.code === 'emergency' && <EmergencyBanner />}
        <span className="eyebrow">Опрос завершён</span>
        <h1 style={{ marginTop: 18, fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>Карточка готова</h1>
        <p className="muted">Она уже в очереди врача. Запись можно скопировать и взять на приём.</p>

        <div style={{ marginTop: 34 }}>
          <CardTable card={card} />
        </div>

        <div className="row" style={{ marginTop: 28 }}>
          <CopyButton card={card} />
          <Link href="/doctor" className="btn light">Экран врача</Link>
        </div>

        <p className="small muted" style={{ marginTop: 26 }}>
          Вердикт посчитан: {card.engine === 'python' ? 'правилами на Python' : 'резервными правилами'}.
          Формулировки: {card.source === 'demo' ? 'записанный ответ модели' : card.source}.
        </p>
        <div ref={bottom} />
      </main>
    );
  }

  return (
    <main className="narrow" style={{ padding: 'clamp(32px, 5vw, 64px) 0' }}>
      <span className="eyebrow">Шаг {question ? question.index : '—'} из {total}</span>
      <h1 style={{ marginTop: 18, fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>Предварительный опрос</h1>
      <p className="muted">Отвечайте своими словами. Система готовит карточку, решение принимает врач.</p>

      <div className="quiz" style={{ marginTop: 34 }}>
        <div className="steps" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} data-done={i < done} />
          ))}
        </div>

        <div className="log">
          {log.map((entry) => (
            <div key={entry.id} className={`line ${entry.who}`}>
              <span className="who">{entry.who === 'me' ? 'вы' : entry.who === 'err' ? 'ошибка' : 'вопрос'}</span>
              {entry.text}
            </div>
          ))}
        </div>

        <form className="composer" onSubmit={submit}>
          <input
            ref={field}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              // Не полагаемся на неявную отправку формы: на мобильных
              // клавиатурах «Готово» ведёт себя по-разному.
              if (event.key === 'Enter') submit(event);
            }}
            placeholder="Ваш ответ"
            autoComplete="off"
            enterKeyHint="send"
            disabled={busy}
            autoFocus
          />
          <button type="submit" className="btn" disabled={busy || !value.trim()}>
            Дальше
          </button>
        </form>
      </div>
      <div ref={bottom} />
    </main>
  );
}

export default function SurveyPage() {
  // useSearchParams требует границы Suspense при пререндере.
  return (
    <Suspense fallback={<main className="narrow" style={{ padding: 64 }}><p className="muted">Загрузка…</p></main>}>
      <Survey />
    </Suspense>
  );
}
