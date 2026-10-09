# Перевірка міграції frontend — 2026-10-09

## Результат

Next.js збирає всі 11 сторінок без кореневих старих `public/` та `secure_html/`.
Старі каталоги, резервну копію поза репозиторієм та тимчасові інструменти
міграції видалено в Кошик Windows. `frontend/public/` залишається каталогом
ресурсів Next.js. Результати перевірки збережено в `frontend/docs/verification/`.

React/FSD композиція сторінок, локалізація, підтримка та сповіщення працюють у
Next.js. Каталог, чат, профіль і адмінка ще використовують scoped контролери
сумісності всередині React. Це не повністю декларативний React rewrite кожного
сценарію бізнес-логіки.

## Що виправлено під час перевірки

- Санітизація зберігає контекст `<table><tbody>` для рядків адмінки, видаляючи
  небезпечні обробники. Наповнені таблиці, комірки та пагінація знову працюють.
- Відновлено backdrop blur у CSS після production-мінімізації. Кнопки профілю
  використовують фактичний шрифт оригіналу замість нормалізованого некоректного CSS.
- CSP дозволяє stylesheet та fonts з уже використаного cdnjs; Font Awesome
  іконки checkout, login та admin відображаються.
- Checkout бере назву і кредити з актуального React dictionary; підтримує
  попередній ключ `credits`, тому український AI Titan не показує `undefined`.
- OAuth guards передають Passport Node raw response для Fastify redirects.
  Google/Facebook callback та email verification повертають явний HTTP 302.
- Frontend return URLs відокремлено від адрес backend webhook через `FRONTEND_URL`.
  Local dev CORS включає порт 3001.
- HTTP `/api` та `/auth` обслуговують Next.js Route Handlers із runtime
  `BACKEND_URL`. Nginx/Kubernetes/Helm ведуть сторінки та ці запити на Next.js;
  Socket.IO, платіжний та video webhooks і службові endpoints залишаються на NestJS.
- NOWPayments IPN перевіряє HMAC-SHA512 над рекурсивно відсортованим JSON.
  Підроблений підпис і невалідний order ID відхиляються до доступу до репозиторію.
  SQL update з `status != APPROVED` не дозволяє пізньому callback відкрити вже
  зараховану транзакцію. Pessimistic write lock та атомарне зарахування збережено.

## Автоматичні перевірки

- Backend build — успішно.
- Frontend production build, typecheck та lint/FSD — успішно.
- Scoped backend ESLint — без помилок; два наявні unused-argument warnings
  у початкових OAuth endpoints.
- Повний backend suite: 22 suites, 83 tests успішні. Зокрема frontend URL, auth callbacks,
  реальна Fastify/JWT/role авторизація admin, Passport provider redirects,
  invoice DTO/return URLs, валідний/підроблений IPN та повторні/пізні callbacks.
  DB/provider writes у платіжних тестах замінено ізольованими doubles.
- 29 різних Playwright tests пройшли у відповідних запусках. Вони перевіряють
  маршрути, admin role boundary, наповнені таблиці й XSS,
  login/register, checkout, український legacy dictionary, SSE/Markdown,
  attachments, errors, notifications/support та збереження мовних чернеток.
- Next proxy перевірено через фактичний локальний upstream: method/body/Bearer
  та streaming після паузи 32 секунди, redirect з двома cookies, gzip та HTTP 204.
  Той самий standalone build перевірено з іншим `BACKEND_URL` під час запуску.
  Ці тести виконалися, не були skipped. Перший запуск runtime-env тесту не запустив
  дочірній server через робочий каталог; після явного `cwd` proxy group пройшла.
- Production/dev Compose config та YAML routing contracts семи ingress host
  entries перевірено локально. Незалежний review додатково перевірив скасування
  потоку, фіксований backend origin для `//host` path та безпечний HTTP 502.
- Тест mobile policy menu виправлено: натискання у видимій частині overlay поза
  sidebar, замість force-click у центрі, який перекриває сама панель.

## Візуальний обсяг

51 paired viewport states: 12 початкових станів шести сторінок та 39 додаткових
станів у 1440×900 і 390×844. Однакові API fixtures, timezone, завантажені fonts,
вимкнені анімації. Реальні Socket.IO/production mutations блокувалися.
У captures немає runtime errors. Checkout background scroll нормалізовано
однаково для обох застосунків, щоб не порівнювати різні місця сторінки.

| Обсяг                                                                  | Результат                                                                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Початкові home/chat/policy/notifications, desktop і mobile             | PNG повністю однакові                                                                                                        |
| Login/signup/language та admin populated/page2/reply, desktop і mobile | PNG повністю однакові                                                                                                        |
| Початкові 12 viewport states                                           | 0 sampled geometry/style differences понад 0.5px                                                                             |
| Додаткові 39 viewport states                                           | 12 sampled differences: лише текстові розміри кредитів checkout та імені профілю                                             |
| Checkout                                                               | Тепер показує Start AI / 750 замість AI Pack / порожніх кредитів; решта sampled геометрії збережена                          |
| Profile                                                                | Visual User замість старого Loading...; після виправлення шрифту password кнопок raster differences лише в імені             |
| Support                                                                | Placeholder порожнього textarea замість старого translation-text, вставленого як користувацьке значення                      |
| Chat додаткові стани                                                   | Невеликі raster differences іконок, максимум 0.0204% pixels з channel delta >10; причина всіх таких відмінностей не доведена |

Повну піксельну тотожність усіх можливих станів не підтверджено. Не охоплено
всі scroll positions, браузери, мови, зовнішні відповіді та комбінації станів.
Числа pixel differences — вимірювання вибраних snapshots, а не гарантія.

Дані: [initial pixel metrics](verification/initial-pixel-metrics.json),
[extended pixel metrics](verification/extended-pixel-metrics.json),
[extended geometry/styles](verification/extended-differences.json).
Приклади: [admin](verification/admin-desktop.png), [checkout](verification/checkout-desktop.png).

## Реальні зовнішні перевірки і межі

NOWPayments production merchant currencies endpoint повернув HTTP 200 із
налаштованим ключем. Це read-only перевірка доступності API. Реальний invoice,
переказ коштів, callback провайдера та зарахування в production DB не виконувалися.
Потрібні окремі sandbox credentials/environment або узгоджений живий платіж.
Mock invoice та локальний HMAC тест не замінюють цю перевірку.

Справжній Google login запущено у Chrome користувача через локальний Next proxy
та ізольований backend із in-memory користувачами, без production DB/Redis/SMTP.
Після виправлення Fastify redirect Google показав HTTP 400
`redirect_uri_mismatch`: `http://localhost:3001/auth/google/callback` не
зареєстрований у Google Cloud. Успішний зовнішній callback не відбувся.
Справжній Facebook provider login не перевірено; його HTTP redirect та відмову
callback перевірено із встановленими Passport strategies і тестовими client IDs.
Production Google session користувача не змінювалася.

SQL concurrency перевірено із керованими repository doubles та незалежним
review; реальні MySQL lock/transaction та зовнішні referral/cache side effects
під навантаженням не перевірялися. Docker образи/production deployment не перевірені.
Збережено попередні симуляції password change/dashboard та blob avatar flow.
Переклади деяких пакетів мають застарілі числові labels; джерелом фактичного
зарахування залишаються backend PACKS, а не локалізований текст.

Підпис IPN відповідає [офіційній документації NOWPayments](https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup).
