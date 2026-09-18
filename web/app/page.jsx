import Link from 'next/link';
import BodyPicker from '../components/BodyPicker';

const FACTS = [
  { n: '01', tag: 'Без регистрации', big: '7 вопросов за 5 минут' },
  { n: '02', tag: 'Решение принимают правила', big: '4 категории срочности' },
  { n: '03', tag: 'Работает без нашего ключа', big: 'Открывается у любого' },
];

const STEPS = [
  { n: '01', title: 'Показываете, где болит', text: 'Поворачиваете модель и отмечаете часть тела. Это не обязательный шаг — можно просто написать словами.' },
  { n: '02', title: 'Отвечаете на семь вопросов', text: 'Текстом, своими словами. Состояние опроса хранится на сервере: вкладку можно закрыть и вернуться.' },
  { n: '03', title: 'Получаете карточку', text: 'Жалобы, длительность, интенсивность, аллергии, хронические заболевания, препараты и черновик записи.' },
  { n: '04', title: 'Врач видит очередь', text: 'Карточки отсортированы по срочности. Запись копируется в буфер одним нажатием.' },
];

export default function Home() {
  return (
    <main>
      <section className="split" style={{ padding: 0 }}>
        <div className="hero">
          <div className="tint" aria-hidden="true">
            <span className="t1" />
            <span className="t2" />
          </div>
          <span className="eyebrow">Предварительный опрос пациента</span>
          <h1 style={{ marginTop: 22 }}>
            Опрос, после
            которого врач
            уже всё знает
          </h1>
          <p className="lead">
            Семь вопросов текстом. На выходе — карточка с категорией срочности,
            тревожными признаками и готовой записью в приём.
          </p>
          <div className="hero-tail">
            <Link href="/survey" className="btn">Пройти опрос</Link>
            <span className="small muted" style={{ marginLeft: 16 }}>Это не диагноз</span>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', display: 'flex', flexDirection: 'column' }}>
          <span className="eyebrow">Покажите, где болит</span>
          <div style={{ marginTop: 20 }}>
            <BodyPicker />
          </div>
        </div>
      </section>

      <section className="trio">
        {FACTS.map((fact) => (
          <article key={fact.n}>
            <span className="eyebrow">{fact.tag}</span>
            <p className="big">{fact.big}</p>
            <span className="num">{fact.n}</span>
          </article>
        ))}
      </section>

      <section className="wrap" style={{ paddingTop: 'clamp(60px, 9vw, 120px)', paddingBottom: 'clamp(40px, 6vw, 80px)' }}>
        <div className="reveal">
          <h2>Как это работает</h2>
        </div>
        <div style={{ marginTop: 'clamp(28px, 4vw, 56px)' }}>
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="reveal"
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(48px, 80px) 1fr',
                gap: 'clamp(16px, 4vw, 60px)', padding: 'clamp(22px, 3vw, 34px) 0',
                borderTop: 'var(--hair)',
              }}
            >
              <span className="num">{step.n}</span>
              <div style={{ display: 'grid', gap: 'clamp(8px, 2vw, 40px)', gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <h3>{step.title}</h3>
                <p className="muted" style={{ margin: 0, maxWidth: '54ch' }}>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="split" style={{ padding: 0, borderTop: 'var(--hair)' }}>
        <div className="reveal">
          <span className="eyebrow">Почему так</span>
          <h2 style={{ marginTop: 20 }}>Категорию определяют правила, а не модель</h2>
        </div>
        <div className="reveal" style={{ background: 'var(--panel)' }}>
          <p className="muted">
            Всё, что влияет на решение — тревожные признаки, интенсивность боли,
            длительность, препараты, меняющие тактику, — считает детерминированный
            код. Модель отвечает только за формулировку жалоб и черновик записи.
          </p>
          <p className="muted">
            Поэтому демонстрационный режим и работа с живым ключом дают одинаковый
            вердикт: посторонний человек видит ровно то же, что мы на репетиции.
          </p>
          <div className="row" style={{ marginTop: 26 }}>
            <Link href="/survey" className="btn">Пройти опрос</Link>
            <Link href="/about" className="btn light">Как устроено</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
