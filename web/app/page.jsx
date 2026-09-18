import Link from 'next/link';

const STEPS = [
  {
    tag: 'US-1',
    title: 'Диалог из семи вопросов',
    text: 'Текстом, без голоса и без регистрации. Состояние опроса живёт на сервере — вкладку можно закрыть и вернуться по ссылке.',
  },
  {
    tag: 'US-2',
    title: 'Структурированная карточка',
    text: 'Жалобы, длительность, боль по десятибалльной шкале, аллергии, хронические заболевания, препараты — и черновик записи в свободной форме.',
  },
  {
    tag: 'US-3',
    title: 'Срочность и тревожные признаки',
    text: 'Одна из четырёх категорий. На «неотложно» экран сразу показывает номер 103 и говорит, чего делать не нужно.',
  },
  {
    tag: 'US-4',
    title: 'Очередь врача',
    text: 'Сортировка по срочности, сводка по потоку и кнопка, кладущая запись в буфер обмена одним нажатием.',
  },
];

export default function Home() {
  return (
    <main>
      <div className="hero">
        <div className="layer" aria-hidden="true">
          <span className="blob blob-a" />
          <span className="blob blob-b" />
          <span className="blob blob-c" />
        </div>
        <div className="layer grid-layer" aria-hidden="true" />
        <div className="chips" aria-hidden="true">
          <span className="chip chip-1">боль 0–10</span>
          <span className="chip chip-2">длительность: ~3 мес</span>
          <span className="chip chip-3">категория: сегодня</span>
        </div>

        <div className="wrap hero-content">
          <h1>Опрос, после которого врач уже всё знает</h1>
          <p className="lead">
            Семь вопросов текстом за пять минут. На выходе — карточка с категорией
            срочности, тревожными признаками и готовой записью в приём.
          </p>

          <div className="menu">
            <Link href="/survey" className="tile accent">
              <span className="mark" aria-hidden="true">◍</span>
              <h3>Пройти опрос</h3>
              <p>Для пациента. Пять минут, ответы своими словами.</p>
            </Link>
            <Link href="/doctor" className="tile">
              <span className="mark" aria-hidden="true">◎</span>
              <h3>Экран врача</h3>
              <p>Очередь по срочности, сводка, копирование записи.</p>
            </Link>
            <Link href="/about" className="tile">
              <span className="mark" aria-hidden="true">◈</span>
              <h3>Как это устроено</h3>
              <p>Архитектура, демо-режим, что считают правила, а что модель.</p>
            </Link>
          </div>
        </div>
      </div>

      <section>
        <div className="wrap reveal">
          <h2>Что делает система</h2>
          <p className="muted" style={{ maxWidth: '58ch' }}>
            Четыре истории, по которым проверяется работа. Пятая — условие допуска:
            всё должно открываться у постороннего человека без нашего ключа к модели.
          </p>
          <div className="cards" style={{ marginTop: 22 }}>
            {STEPS.map((step) => (
              <article key={step.tag} className="card">
                <span className="tag">{step.tag}</span>
                <h3 style={{ margin: '.3em 0 0', fontSize: '1.1rem' }}>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--surface-2)' }}>
        <div className="narrow reveal">
          <h2>Категорию определяют правила, а не модель</h2>
          <p className="muted">
            Всё, что влияет на решение — тревожные признаки, интенсивность боли,
            длительность, препараты, меняющие тактику, — считает детерминированный
            код на Python. Модель отвечает только за формулировку жалоб и черновик
            записи.
          </p>
          <p className="muted">
            Поэтому демонстрационный режим и работа с живым ключом дают одинаковый
            вердикт: проверяющий видит ровно то же, что мы на репетиции.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link href="/survey" className="tile" style={{ padding: '12px 18px' }}>
              Попробовать опрос
            </Link>
            <Link href="/about" className="tile" style={{ padding: '12px 18px' }}>
              Посмотреть архитектуру
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
