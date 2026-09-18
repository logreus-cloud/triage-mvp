import { Manrope } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import Nav from '../components/Nav';
import ScrollFx from '../components/ScrollFx';

// Плотный геометрический гротеск — основа типографики референса.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata = {
  title: 'Триаж · предварительный опрос пациента',
  description:
    'Семь вопросов текстом превращаются в структурированную карточку для врача с категорией срочности.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f1ede6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={manrope.className}>
      <body>
        <Nav />
        <ScrollFx />
        {children}
        <footer>
          <div className="wrap">
            <div className="foot-cols">
              <div>
                <h4>Разделы</h4>
                <Link href="/">Главная</Link>
                <Link href="/survey">Опрос</Link>
                <Link href="/doctor">Экран врача</Link>
                <Link href="/about">Как устроено</Link>
              </div>
              <div>
                <h4>Если плохо сейчас</h4>
                <a href="tel:103">Скорая — 103</a>
                <p className="muted small">Со стационарного — 03</p>
              </div>
              <div>
                <h4>Проект</h4>
                <a href="https://github.com/logreus-cloud/triage-mvp">Исходный код</a>
                <p className="muted small">Демонстрационный режим</p>
              </div>
              <div>
                <h4>Важно</h4>
                <p className="muted small">
                  Не является медицинской услугой и не ставит диагноз.
                  Решение принимает врач.
                </p>
              </div>
            </div>

            <div className="wordmark" aria-hidden="true">триаж</div>

            <div className="foot-end">
              <span>Учебный проект</span>
              <span className="spacer" />
              <span>сборка {process.env.NEXT_PUBLIC_BUILD}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
