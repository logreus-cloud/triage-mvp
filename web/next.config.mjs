/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Фронтенд не знает адрес API на клиенте: браузер ходит на свой же
  // /api/*, а прокси-роут пересылает запрос на сервере. Так нет CORS
  // и адрес бэкенда не светится в исходниках страницы.
  env: {
    NEXT_PUBLIC_BUILD: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || 'local',
  },
};
