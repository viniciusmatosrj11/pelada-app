-- ============================================================
-- PELADA FÁCIL — Schema do banco (Supabase / PostgreSQL)
-- Copie e cole este arquivo inteiro no SQL Editor do Supabase
-- e clique em "Run". Pode ser executado do zero em um projeto novo.
-- ============================================================

-- 1) PROFILES — dados do dono da pelada (1 linha por usuário logado)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  created_at timestamptz not null default now()
);

-- 2) PELADAS — cada pelada criada por um dono
create table if not exists peladas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  local text not null,
  data date not null,
  horario time not null,
  limite_jogadores int not null default 20,
  valor_mensalista numeric(10,2) not null default 0,
  valor_diarista numeric(10,2) not null default 0,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_peladas_owner on peladas(owner_id);
create index if not exists idx_peladas_slug on peladas(slug);

-- 3) PARTICIPANTES — jogadores que confirmam presença em uma pelada (sem login)
create table if not exists participantes (
  id uuid primary key default gen_random_uuid(),
  pelada_id uuid not null references peladas(id) on delete cascade,
  nome text not null,
  tipo text check (tipo in ('mensalista', 'diarista')), -- nulo quando "não vai"
  status_presenca text not null default 'pendente'
    check (status_presenca in ('confirmado', 'nao_vai', 'espera', 'pendente')),
  status_pagamento text not null default 'pendente'
    check (status_pagamento in ('pago', 'pendente')),
  created_at timestamptz not null default now()
);

create index if not exists idx_participantes_pelada on participantes(pelada_id);

-- ============================================================
-- SEGURANÇA (Row Level Security)
-- ============================================================

alter table profiles enable row level security;
alter table peladas enable row level security;
alter table participantes enable row level security;

-- PROFILES: cada usuário só vê/edita o próprio perfil
create policy "profiles_select_proprio" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_proprio" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_proprio" on profiles
  for update using (auth.uid() = id);

-- PELADAS: qualquer pessoa (com o link) pode LER uma pelada,
-- pois a página pública do jogador precisa consultar os dados.
create policy "peladas_select_publico" on peladas
  for select using (true);

-- Só o dono pode criar, editar ou apagar as próprias peladas
create policy "peladas_insert_dono" on peladas
  for insert with check (auth.uid() = owner_id);

create policy "peladas_update_dono" on peladas
  for update using (auth.uid() = owner_id);

create policy "peladas_delete_dono" on peladas
  for delete using (auth.uid() = owner_id);

-- PARTICIPANTES:
-- Leitura pública (necessária para mostrar "X/Y confirmados" na página do jogador)
create policy "participantes_select_publico" on participantes
  for select using (true);

-- Qualquer jogador com o link pode se inscrever (sem estar logado)
create policy "participantes_insert_publico" on participantes
  for insert with check (true);

-- Só o dono da pelada correspondente pode alterar (ex: marcar pagamento)
create policy "participantes_update_dono" on participantes
  for update using (
    exists (
      select 1 from peladas
      where peladas.id = participantes.pelada_id
      and peladas.owner_id = auth.uid()
    )
  );

-- Só o dono da pelada correspondente pode remover um participante
create policy "participantes_delete_dono" on participantes
  for delete using (
    exists (
      select 1 from peladas
      where peladas.id = participantes.pelada_id
      and peladas.owner_id = auth.uid()
    )
  );