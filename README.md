# ChessPoint Publisher

Очередь постов под публикацию по каналам (Telegram / Twitter / Instagram / Threads / YouTube / TikTok / LinkedIn).
Карточка поста: дата, №, картинка (скачать / копировать), копировать текст, кнопка «Выложено» → пост уходит в общий лог с экспортом в CSV.

Стек: **Next.js + Supabase (Postgres + Storage) + Vercel**.

---

## 1. Supabase (5 минут)

1. Зарегистрируйся на [supabase.com](https://supabase.com), создай новый проект (запомни пароль БД).
2. Открой **SQL Editor → New query**, вставь содержимое `supabase/schema.sql`, нажми **Run**.
   Это создаст таблицу `posts` и публичный bucket `post-images`.
3. Открой **Project Settings → API**, скопируй:
   - `Project URL` → в `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` ключ → в `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` ключ (СЕКРЕТНЫЙ) → в `SUPABASE_SERVICE_ROLE_KEY`

## 2. Локальный запуск

```bash
cp .env.local.example .env.local   # заполни значениями из Supabase + придумай SITE_PASSWORD
npm install
npm run dev
```

Открой http://localhost:3000 → введи `SITE_PASSWORD`.

## 3. Деплой на Vercel

1. Залей проект в репозиторий GitHub (или `vercel` CLI).
2. На [vercel.com](https://vercel.com) → **Add New → Project** → импортируй репозиторий.
3. В **Environment Variables** добавь все 4 переменные из `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_PASSWORD`.
4. **Deploy.** Готово.

---

## Как добавлять посты

**Через форму** (`/admin` → «Добавить один пост») — канал, дата, текст, картинка drag&drop.

**Массово (JSON)** — `/admin` → «Массовый импорт». Формат:

```json
[
  { "channel": "twitter",  "scheduled_date": "2026-06-01", "body": "Текст твита…" },
  { "channel": "telegram", "scheduled_date": "2026-06-01", "body": "Текст для TG…" }
]
```

Допустимые `channel`: `telegram`, `twitter`, `instagram`, `threads`, `youtube`, `tiktok`, `linkedin`.
Нумерация (`post_number`) проставляется автоматически по каждому каналу.
Картинки после импорта прикрепляются в «Очереди» кнопкой **+ Прикрепить картинку** (файлы через JSON не передаются).

## Структура

```
app/
  page.tsx            — Очередь (табы по каналам, карточки)
  published/page.tsx  — Лог выложенного + экспорт CSV
  admin/page.tsx      — Добавление / импорт
  login/page.tsx      — Вход по паролю
  actions.ts          — серверные действия (CRUD, загрузка картинок)
components/            — Nav, PostCard, QueueClient, AdminClient, PublishedClient
lib/                  — constants (каналы), types, supabase/server
proxy.ts              — пароль на весь сайт
supabase/schema.sql   — схема БД + bucket
```
