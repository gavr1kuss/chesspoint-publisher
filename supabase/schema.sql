-- ChessPoint Publisher — Supabase schema
-- Запусти это целиком в Supabase → SQL Editor → New query → Run.

-- 1. Таблица постов
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  channel       text not null,                 -- telegram | twitter | instagram | threads | youtube | tiktok | linkedin
  post_number   integer,                       -- нумерация внутри канала (проставляется автоматически)
  scheduled_date date,                          -- дата под публикацию
  body          text not null default '',      -- текст поста
  image_url     text,                          -- публичная ссылка на картинку в Storage
  image_path    text,                          -- путь файла в Storage (для удаления)
  status        text not null default 'queued',-- queued | posted
  posted_at     timestamptz,                   -- когда нажали "Выложено"
  created_at    timestamptz not null default now()
);

create index if not exists posts_channel_status_idx on public.posts (channel, status);
create index if not exists posts_status_idx on public.posts (status);

-- 2. Хранилище картинок (bucket с публичным чтением)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Доступ к таблице/хранилищу идёт через service_role ключ на сервере Next.js,
-- поэтому RLS можно оставить выключенным (по умолчанию для новой таблицы RLS off).
-- Если включишь RLS — добавь политики под service_role.
