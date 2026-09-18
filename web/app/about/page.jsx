const STACK = [
  ['Next.js 16 + React 19', 'Лендинг, опрос и экран врача. Серверный прокси-роут прячет адрес API и снимает вопрос CORS.'],
  ['Three.js', 'Модель тела для указания зоны боли. Собрана из примитивов, без внешних файлов — лишний запрос стоил бы секунды до первого кадра.'],
  ['CSS без фреймворка', 'Палитра токенами, тёмная тема, параллакс на одной переменной вместо пересчёта в JS.'],
  ['Node.js + Express', 'Диалог, сборка карточки, очередь. Ходит в сервис правил и умеет работать без него.'],
  ['Python + FastAPI', 'Тревожные признаки, разбор длительности из свободного текста, препараты меняющие тактику, сводка.'],
  ['pytest', 'Двадцать четыре теста на правила, включая случаи, которые ломались на практике.'],
];

const DECISIONS = [
  ['Вердикт считают правила, а не модель',
    'Категория срочности выводится детерминированным кодом. Иначе демонстрационный режим и живой ключ давали бы разные ответы, и проверяющий увидел бы не то, что мы показывали на репетиции.'],
  ['Сервис правил не обязателен',
    'Node вызывает его с таймаутом в четыре секунды. Если сервис спит, карточка собирается по упрощённым правилам и честно помечается. На бесплатном хостинге это не теоретический сценарий — мы поймали такой отказ на живом деплое.'],
  ['Модель тела — ввод, а не украшение',
    'Выбранная зона подставляется в первый ответ опроса. Указать пальцем быстрее, чем подбирать слова, но обязательным шагом это не сделано: то же самое можно написать текстом.'],
  ['Длительность разбирается, а не хранится строкой',
    '«Три недели», «минут сорок назад», «с 1 июля» приводятся к числу дней. Когда пациент называет дату без года, система берёт прошлый год и помечает карточку как требующую уточнения, а не делает вид, что поняла.'],
];

export default function About() {
  return (
    <main>
      <section className="wrap" style={{ paddingTop: 'clamp(40px, 6vw, 90px)' }}>
        <span className="eyebrow">Архитектура</span>
        <h1 style={{ marginTop: 20 }}>Как устроено</h1>
        <p className="muted" style={{ maxWidth: '52ch', fontSize: '1.1rem' }}>
          Три независимых сервиса. Фронтенд знает только собственный адрес,
          API знает про сервис правил, сервис правил не знает ни про кого.
        </p>
      </section>

      <section className="wrap">
        <pre className="small" style={{
          overflowX: 'auto', lineHeight: 1.9, padding: 'clamp(20px, 3vw, 34px)',
          background: 'var(--panel)', margin: '10px 0 0', border: 'var(--hair)',
        }}>{`браузер
   ↓  /api/*  (тот же origin, без CORS)
web — Next.js, прокси-роут
   ↓  API_URL
api — Node + Express: диалог, карточка, очередь
   ↓  RULES_URL, таймаут 4 с, откат на резервные правила
rules — Python + FastAPI: срочность, длительность, сводка`}</pre>
      </section>

      <section className="wrap" style={{ paddingTop: 'clamp(50px, 7vw, 90px)' }}>
        <h2 className="reveal">Стек</h2>
        <div style={{ marginTop: 30 }}>
          {STACK.map(([name, role]) => (
            <div key={name} className="reveal" style={{
              display: 'grid', gridTemplateColumns: 'minmax(180px, 280px) 1fr',
              gap: 'clamp(14px, 3vw, 50px)', padding: 'clamp(18px, 2.4vw, 26px) 0',
              borderTop: 'var(--hair)',
            }}>
              <strong>{name}</strong>
              <p className="muted" style={{ margin: 0 }}>{role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 'clamp(50px, 7vw, 90px)' }}>
        <h2 className="reveal">Решения, которые стоит знать</h2>
        <div style={{ marginTop: 30 }}>
          {DECISIONS.map(([title, text]) => (
            <div key={title} className="reveal" style={{
              display: 'grid', gridTemplateColumns: 'minmax(180px, 280px) 1fr',
              gap: 'clamp(14px, 3vw, 50px)', padding: 'clamp(18px, 2.4vw, 26px) 0',
              borderTop: 'var(--hair)',
            }}>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <p className="muted" style={{ margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="split" style={{ padding: 0, marginTop: 'clamp(40px, 6vw, 80px)', borderTop: 'var(--hair)' }}>
        <div>
          <span className="eyebrow">Границы</span>
          <h2 style={{ marginTop: 18 }}>Чего здесь нет</h2>
        </div>
        <div style={{ background: 'var(--panel)' }}>
          <p className="muted">
            Голосового ввода, ролей и админки, интеграций с медицинскими
            информационными системами, реальных персональных данных,
            авторизации сложнее пароля в переменных окружения.
          </p>
          <p className="muted">
            Это MVP под критерии приёмки, а не продукт. Модель тела не является
            анатомическим пособием: она нужна только для указания области.
          </p>
        </div>
      </section>
    </main>
  );
}
