# Genyxo frontend

Next.js App Router, React, TypeScript та Tailwind CSS. Відтворено розмітку, ресурси,
адаптивні стилі й старі адреси сторінок із `public/` та `secure_html/`.

## Запуск

Потрібен Node.js 22 або новіший.

```powershell
npm ci
npm --prefix frontend ci
Copy-Item frontend/.env.example frontend/.env.local
npm run start:dev
# В іншому терміналі:
npm run frontend:dev
```

Backend працює на порту 3000, frontend — на 3001. `BACKEND_URL` задає адресу
NestJS для серверного проксі `/api/*` та OAuth `/auth/*`. `NEXT_PUBLIC_SOCKET_URL`
задає публічну адресу NestJS для прямого Socket.IO підключення. Для локального
роздільного запуску додайте адресу frontend до backend `ALLOWED_ORIGINS`.
Для спільного домену з nginx, який проксіює `/socket.io/`, залиште
`NEXT_PUBLIC_SOCKET_URL` порожнім. Ця змінна вбудовується під час збірки.

```powershell
npm run frontend:check
npm run frontend:build
npm --prefix frontend run start
```

`start` готує assets і запускає standalone server. За замовчуванням він слухає
`127.0.0.1:3001`; доступні змінні `PORT` та `HOSTNAME`.

## Архітектура

- `app/` — маршрути, layout та metadata Next.js.
- `src/fsd/pages/` — композиція сторінок та їхній життєвий цикл.
- `src/fsd/widgets/` — React-розмітка великих блоків.
- `src/fsd/features/` — сценарії чату, каталогу, профілю, підтримки та сповіщень.
- `src/fsd/entities/session/` — стан імені користувача та серверна перевірка доступу адміністратора.
- `src/fsd/shared/` — i18n, конфігурація, стилі та керування ресурсами сторінки.

Alias `@/` відповідає `src/fsd/`. Вкладений каталог `fsd` запобігає конфлікту
FSD `pages` із зарезервованим Next.js Pages Router. Перевірка архітектури у lint
відхиляє імпорти у вищі шари та імпорти між різними slices одного шару.

Мовний стан, підтримка й сповіщення реалізовані React hooks/components.
Складні сценарії каталогу, чату, профілю та адмінки збережено в модульних
контролерах сумісності. Вони працюють із DOM усередині React-розмітки;
це ще не повністю декларативна React-реалізація всієї бізнес-логіки.
`ControllerScope` прибирає listeners, timers, observers, запити та socket
при виході зі сторінки. Обробники скомпільовані: немає `eval`, `Function`
чи виконання HTML scripts. Динамічний HTML проходить DOMPurify.

Tailwind працює з префіксом `gx` без Preflight. Оригінальні точні CSS-правила
збережені разом із Tailwind utilities, щоб не змінювати геометрію дизайну.
Оригінальні HTML/JS не є ресурсами нового Next.js застосунку.

`scripts/migrate-sources.mjs` — інструмент початкового перенесення з оригінальних
файлів. Він перезаписує згенеровані сторінки, widgets і контролери; не запускайте
його як звичайний build або після ручного редагування цих файлів.

## Сумісність та перевірки

Збережено `.html` адреси, параметри історії чату, API DTO, JWT Bearer headers,
SSE та OAuth redirect routes. `/gate.html`, `/admin.html` і старий admin panel URL
ведуть на `/admin`; доступ відкривається лише після відповіді захищеного NestJS
endpoint. Значення role у localStorage не надає доступу.

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
# Один раз встановіть браузер:
cd frontend
npx playwright install chromium
npm test
```

Playwright використовує тестові API-відповіді для сторінок, помилок мутацій,
локалізації, SSE, санітизації й авторизації. Окремі тести піднімають локальний
HTTP upstream на порту 3000 для перевірки реального Next proxy та SSE паузи
32 секунди; якщо порт зайнятий, лише ці тести пропускаються.

Реальні платежі, зовнішні OAuth провайдери та генерація відео потребують
налаштованого backend і облікових даних; fixtures не доводять їхню роботу.
Збережено обмеження вихідного застосунку: симуляцію зміни пароля,
демонстраційні графіки/dashboard та надсилання локального blob URL для аватара.
Візуальне порівняння охоплює початкові стани шести сторінок на 1440×900 і
390×844; воно не гарантує піксельну тотожність усіх можливих станів.
