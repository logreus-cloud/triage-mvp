import './globals.css';
import Nav from '../components/Nav';
import ScrollFx from '../components/ScrollFx';

export const metadata = {
  title: 'Триаж · предварительный опрос пациента',
  description:
    'Текстовый опрос из семи вопросов превращается в структурированную карточку для врача с категорией срочности.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f4ee',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <Nav />
        <ScrollFx />
        {children}
        <footer>
          <div className="wrap row">
            <span>Не является медицинской услугой и не ставит диагноз.</span>
            <span className="spacer" />
            <span className="small">сборка {process.env.NEXT_PUBLIC_BUILD}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
