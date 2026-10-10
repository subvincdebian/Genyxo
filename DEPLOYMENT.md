# Развёртывание Genyxo

Приложения находятся в `apps/backend` и `apps/web`. Общая инфраструктура
остаётся в корне: `nginx/`, `k8s/`, `helm/`, `gitops/`, `scripts/`.
Настройка приложений и границы модулей описаны в `docs/architecture.md`.

## Локальная разработка

Нужны Node.js 22+, npm, Docker Engine и актуальный Docker Compose v2+.
Для проверки Helm используется версия 3.19.0.

```sh
npm ci
npm run deps:install
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
# Заполните параметры приложения перед запуском.
bash scripts/dev.sh up
```

Windows: `./scripts/dev.ps1 -Action up`.
Dev Compose использует отдельные volumes и локальные пароли; API доступен
на `localhost:3000`, web на `localhost:3001`, MySQL на `localhost:3306`,
Redis на `localhost:6379`, Redis Commander на `localhost:8081`.
Миграции dev-базы выполняют отдельно: `npm run db:migrate` с локальными
MYSQLHOST/REDISHOST и параметрами доступа, либо из backend-контейнера.

## Production на одном Docker-хосте

Подготовьте `apps/backend/.env` с настоящими паролями и ключами, корректными
`SITE_URL`, `FRONTEND_URL`, `ALLOWED_ORIGINS` и callback URL провайдеров.
Нельзя использовать пароли из примера. Production launcher не создаёт `.env`.

Разместите действительный TLS full chain в `nginx/ssl/cert.pem`, private key
в `nginx/ssl/key.pem`. Файлы игнорируются Git и исключены из Docker context;
в production они монтируются read-only. Настройте DNS и обновление сертификатов
на хосте. Самоподписанные сертификаты разрешены только базовым локальным стеком.

```sh
bash scripts/prod.sh up
# Windows: ./scripts/prod.ps1 -Action up
```

Launcher использует `docker-compose.yml` и `docker-compose.prod.yml`:
проверяет конфигурацию, собирает образы, запускает MySQL/Redis, выполняет
`db-migrate`, затем запускает приложения с `up -d --wait`.
Ошибка миграции прекращает rollout. Уже работающие приложения во время
миграции остаются активны: изменения схемы должны быть совместимы с предыдущей
версией (expand/contract). Откат образов не откатывает изменения базы данных.
Перед рискованной миграцией нужен проверенный backup и план восстановления.

Backend имеет три реплики, web две, Nginx одну: его host ports фиксированы.
Это конфигурация одного хоста; несколько хостов обслуживаются Kubernetes/Helm.
Данный Compose не является поддерживаемым Docker Swarm stack.
Для перезапуска используйте `restart`, для остановки `down`, просмотра `status`
или `logs`. `down` без `--volumes` сохраняет данные.

HTTP перенаправляется на HTTPS; `/health` и ACME challenge доступны по HTTP.
Nginx направляет страницы, `/api/*`, `/auth/*` в Next.js, Socket.IO и прямые
backend endpoints в NestJS. MySQL/Redis не публикуются наружу production-стеком.
Redis использует `noeviction`, поскольку в нём также находятся BullMQ jobs;
следите за памятью, очередями и ошибками записи.

## Kubernetes: предварительные условия

Нужны доступный кластер, registry access к образам, StorageClass/PVC для БД,
MySQL и Redis, ingress-nginx, TLS/cert-manager и настроенный ClusterIssuer.
HPA требует metrics-server; production Helm values с KEDA требуют KEDA CRDs
и controller. Chart устанавливает приложения и migration Job, а не базы данных.

Для raw manifests подготовьте реальный `k8s/02-secret.yaml` на основе
`k8s/02-secret.example.yaml` и проверьте `k8s/01-configmap.yaml`.
Файл настоящих секретов игнорируется Git. Не применяйте example как production.
MySQL/Redis из `k8s/database/*-statefulset.yaml` при использовании внутренних
БД должны быть готовы до deployment приложений. Сетевые политики предполагают
MySQL/Redis в том же namespace с предусмотренными labels; внешние БД требуют
соответствующего изменения egress.

```sh
bash scripts/k8s-deploy.sh
```

Скрипт проверяет manifests, требует настоящий Secret, применяет базовую
конфигурацию и политики, пересоздаёт migration Job и ждёт его завершения.
Только после успеха применяются workloads и проверяется rollout.
Укажите одинаковый неизменяемый image tag в backend Deployment и migration Job,
а также нужный tag frontend, перед применением manifests.

## Helm и секреты

Рекомендуемый путь: заранее подготовленный Secret `genyxo-secrets` в namespace
релиза с ключами из `k8s/02-secret.example.yaml`. Значения должны соответствовать
фактически настроенным MySQL/Redis и используемым интеграциям.

```sh
helm lint helm/genyxo --set secrets.existingSecret=genyxo-secrets
helm template genyxo helm/genyxo \
  -f helm/genyxo/values-production.yaml \
  --set secrets.existingSecret=genyxo-secrets

# IMAGE_TAG: опубликованный commit SHA или другой неизменяемый release tag.
helm upgrade --install genyxo helm/genyxo \
  --namespace genyxo --create-namespace \
  -f helm/genyxo/values-production.yaml \
  --set-string secrets.existingSecret=genyxo-secrets \
  --set-string backend.image.tag="$IMAGE_TAG" \
  --set-string frontend.image.tag="$IMAGE_TAG" \
  --atomic --wait --timeout 10m
```

Managed Secret также поддерживается через закрытый values-файл в `.secrets/`;
не передавайте секретные значения в shell arguments и не коммитьте их.
Пустые обязательные credentials и известные placeholders останавливают rendering.
Без `existingSecret` Helm хранит управляемые значения в release metadata: доступ
к нему должен быть ограничен. Наличие внешнего Secret и сервисов проверяется
при реальном запуске Job, а не при offline `helm template`.

Pre-install/pre-upgrade и Argo PreSync запускают миграцию раньше workloads.
Для Job создаётся отдельный migration ConfigMap, а для managed credentials
отдельный migration Secret: неуспешная миграция не подменяет конфигурацию
работающих приложений. Эти пассивные hook resources сохраняются до следующего
запуска и не удаляются автоматически вместе с Helm release; после полного
удаления приложения их очищают отдельно. `--atomic` не откатывает данные БД.

## Реплики и realtime

Socket.IO использует Redis Pub/Sub для уведомлений между backend-репликами.
Для polling нужна привязка к реплике: Docker Nginx использует `ip_hash`,
Kubernetes — отдельный `/socket.io` Ingress с cookie `GENYXO_SID`, Path `/socket.io`.
Web включает credentials для cross-origin socket connections; разрешённые
origins должны точно соответствовать адресам frontend.

Pub/Sub доставка best effort; постоянные уведомления читаются из БД.
Auth-cache общий в Redis: изменение роли другой репликой становится видно
после инвалидирования. Это не устраняет существующую гонку заполнения кеша
одновременно с инвалидированием. Остановка backend закрывает локальные BullMQ
workers и не ставит общую очередь на паузу. Persistent backend/worker обязателен
для очередей и Socket.IO: Vercel HTTP handler сам их не заменяет.

Migration runner держит advisory lock на выделенном master-соединении MySQL,
освобождает его после миграций и завершает CLI с ошибкой после cleanup.
Database errors не выводятся целиком в deployment logs.

## CI и GitOps

`.github/workflows/ci-cd.yml` проверяет пути/lockfiles, Compose, deployment
regressions, TypeScript/lint, backend tests, сборки, API contract drift и browser
tests. Затем публикует образы в lowercase GHCR repository, сканирует backend,
web и Nginx. HIGH/CRITICAL останавливают deployment; находки требуют устранения
или отдельного обоснованного решения, их нельзя молча игнорировать.

Production job использует GitHub environment `production`, секрет `KUBECONFIG`
(base64 kubeconfig), уже подготовленный `genyxo-secrets`, production values
и одинаковый commit SHA для backend и migration Job. Отсутствие credentials
является ошибкой. Настройте environment protection и registry pull access
в самом GitHub/кластере; файлы репозитория не создают эти настройки.

CI владеет production rollout по умолчанию. Production Argo Application
оставлен с ручным sync. Для перехода на автоматический GitOps сначала отключите
CI deploy и задайте неизменяемые image tags в GitOps-конфигурации; после этого
включите automated sync. Два controller не должны одновременно менять release.
Staging Application использует отдельный namespace и отдельные credentials.

## Резервные копии и dev-сертификаты

`bash scripts/db-backup.sh` сохраняет выбранную `MYSQL_DATABASE` (либо
`MYSQLDATABASE`, по умолчанию `genyxo`) из `MYSQL_CONTAINER` (по умолчанию
`genyxo-mysql`). `BACKUP_DIR` задаёт каталог; `RETENTION_DAYS` — целое число
дней хранения, по умолчанию 14. Пароль берётся внутри контейнера из
`MYSQL_ROOT_PASSWORD` и не передаётся в аргументах Docker/mysqldump.
После успешного дампа и gzip временный приватный файл переименовывается
в готовый архив; при ошибке неполный файл удаляется, старые копии сохраняются.
Ротация выполняется после успешного сохранения. Проверяйте восстановление
в отдельной БД и храните копии вне этого хоста; локальный архив не защищает
от потери хоста. Дамп не включает MySQL accounts и grants других баз.

Локальные сертификаты создаются `bash nginx/generate-dev-certs.sh` либо
`./nginx/generate-dev-certs.ps1` с OpenSSL в PATH. Скрипты проверяют результат
OpenSSL, очищают временные файлы при ошибке и сохраняют существующую пару.
Неполная существующая пара требует ручной проверки. Сертификат содержит SAN
для localhost/127.0.0.1 и предназначен для разработки.

Автоматический npm release не используется: версия container release — commit
SHA. Устаревший `.releaserc.json` удалён; неопределённые release plugins
не добавляются в зависимости приложения.

## Проверка перед выпуском

```sh
npm run check
npm run check:compose
npm run test:tooling
npm test -- --runInBand
npm run build
npm run contracts:sync
# Browser tests после сборки и установки Chromium:
npm run test:web
```

Backend e2e требует настоящих тестовых MySQL/Redis. Инфраструктурные тесты
используют mocked Docker/kubectl; Helm tests проверяют настоящий rendering.
Эти проверки не заменяют staging rollout, CNI/Ingress проверки, Redis failover,
восстановление backup и нагрузочное тестирование перед production.
