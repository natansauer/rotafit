-- RotaFit: esquema do banco (execute no SQL Editor do Supabase)
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_meters numeric(10, 2) not null check (distance_meters >= 0),
  duration_seconds int not null check (duration_seconds > 0),
  avg_pace_sec_per_km numeric(8, 2) check (avg_pace_sec_per_km is null or avg_pace_sec_per_km > 0),
  -- Rota como uma lista de pontos [{lat, lng, t}], já simplificada no app.
  route jsonb not null default '[]'::jsonb,
  spotify_track_name text,
  created_at timestamptz not null default now(),
  constraint ended_after_started check (ended_at >= started_at)
);

create index runs_user_idx on public.runs (user_id, started_at desc);

alter table public.runs enable row level security;

-- Cada usuário só lê, cria e apaga as PRÓPRIAS corridas. Aqui não há preço nem
-- terceiro envolvido: o próprio dono pode escrever direto, desde que os dados
-- sejam dele (user_id = auth.uid()).
create policy "Corridas: ler as próprias"
  on public.runs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Corridas: criar como dono"
  on public.runs for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Corridas: apagar as próprias"
  on public.runs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- CORREÇÃO: no Supabase real, os "default privileges" do schema public já dão
-- ALL nas tabelas novas para anon e authenticated. O RLS continua bloqueando,
-- mas deixamos explícito o mínimo necessário (defesa em profundidade).
revoke all on public.runs from anon;
revoke all on public.runs from authenticated;
grant select, insert, delete on public.runs to authenticated;

-- Estatísticas da semana: total percorrido, tempo total e número de corridas.
-- security invoker (padrão): roda com os direitos de quem chama, então o RLS
-- de "runs" já filtra sozinho — a função só soma o que a política deixa ver.
-- CORREÇÃO: date_trunc('week', now()) usa o fuso da sessão (UTC no Supabase).
-- Passamos para America/Sao_Paulo para a semana começar na segunda-feira 00h
-- do horário de Brasília, e não às 21h de domingo.
create or replace function public.weekly_stats()
returns table (total_distance_meters numeric, total_duration_seconds bigint, run_count bigint)
language sql
stable
set search_path = public
as $$
  select
    coalesce(sum(distance_meters), 0),
    coalesce(sum(duration_seconds), 0),
    count(*)
  from public.runs
  where started_at >= (date_trunc('week', now() at time zone 'America/Sao_Paulo')
                       at time zone 'America/Sao_Paulo');
$$;

-- CORREÇÃO: o Supabase concede EXECUTE em funções novas diretamente a anon
-- (não só via "public"), então revogar de public não basta.
revoke all on function public.weekly_stats() from public;
revoke all on function public.weekly_stats() from anon;
grant execute on function public.weekly_stats() to authenticated;
