-- ============================================================================
-- Miss France 2027 — Soirée en famille : schéma Supabase
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans risque (il ne supprime pas les données).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- Tables
create table if not exists game (
  id int primary key default 1 check (id = 1),
  phase text not null default 'accueil',
  on_stage text,
  results jsonb not null default '{"top15":[],"top5":[],"verdict":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into game (id) values (1) on conflict do nothing;

create table if not exists admin_settings (
  id int primary key default 1 check (id = 1),
  pin text not null
);
-- ⚠️ Change ce code juste après l'installation (voir README) :
insert into admin_settings (id, pin) values (1, 'CHANGE-MOI') on conflict do nothing;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists players_name_unique on players (lower(name));

create table if not exists player_secrets (
  player_id uuid primary key references players (id) on delete cascade,
  secret uuid not null unique default gen_random_uuid()
);

create table if not exists predictions (
  player_id uuid not null references players (id) on delete cascade,
  kind text not null check (kind in ('avant', 'apres15', 'final', 'chouchoute')),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (player_id, kind)
);

create table if not exists ratings (
  player_id uuid not null references players (id) on delete cascade,
  candidate_id text not null,
  round text not null check (round in ('costume', 'maillot', 'robe', 'discours')),
  score int not null check (score between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (player_id, candidate_id, round)
);

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  type text not null check (type in ('candidate', 'choices')),
  options jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  answer text,
  points int not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists bet_answers (
  bet_id uuid not null references bets (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  choice text not null,
  updated_at timestamptz not null default now(),
  primary key (bet_id, player_id)
);

-- ---------------------------------------------------------------- Sécurité
-- Lecture publique des données de jeu ; aucune écriture directe :
-- tout passe par les fonctions ci-dessous. Les secrets et le code admin sont invisibles.
alter table game enable row level security;
alter table admin_settings enable row level security;
alter table players enable row level security;
alter table player_secrets enable row level security;
alter table predictions enable row level security;
alter table ratings enable row level security;
alter table bets enable row level security;
alter table bet_answers enable row level security;

drop policy if exists "lecture" on game;
create policy "lecture" on game for select using (true);
drop policy if exists "lecture" on players;
create policy "lecture" on players for select using (true);
drop policy if exists "lecture" on predictions;
create policy "lecture" on predictions for select using (true);
drop policy if exists "lecture" on ratings;
create policy "lecture" on ratings for select using (true);
drop policy if exists "lecture" on bets;
create policy "lecture" on bets for select using (true);
drop policy if exists "lecture" on bet_answers;
create policy "lecture" on bet_answers for select using (true);

-- ---------------------------------------------------------------- Temps réel
alter table game replica identity full;
alter table players replica identity full;
alter table predictions replica identity full;
alter table ratings replica identity full;
alter table bets replica identity full;
alter table bet_answers replica identity full;

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['game', 'players', 'predictions', 'ratings', 'bets', 'bet_answers'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- Outils internes
create or replace function _phase_index(p text) returns int
language sql immutable as $$
  select array_position(
    array['accueil','ouverture','costumes','top15','maillot','robes','top5','discours','verdict','fin'], p)
$$;

create or replace function _player_id(p_secret uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select player_id into v from player_secrets where secret = p_secret;
  if v is null then raise exception 'NOT_FOUND'; end if;
  return v;
end $$;

create or replace function _check_pin(p_pin text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_settings where pin = p_pin) then
    raise exception 'BAD_PIN';
  end if;
end $$;

create or replace function _clean_name(p_name text) returns text
language plpgsql immutable as $$
declare v text := btrim(coalesce(p_name, ''));
begin
  if length(v) < 1 or length(v) > 24 then raise exception 'INVALID'; end if;
  return v;
end $$;

revoke execute on function _player_id(uuid) from public, anon, authenticated;
revoke execute on function _check_pin(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- Joueurs
create or replace function join_game(p_name text, p_avatar text) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_secret uuid; v_name text := _clean_name(p_name);
begin
  insert into players (name, avatar) values (v_name, left(coalesce(p_avatar, '🙂'), 16)) returning id into v_id;
  insert into player_secrets (player_id) values (v_id) returning secret into v_secret;
  return json_build_object('playerId', v_id, 'secret', v_secret);
exception when unique_violation then
  raise exception 'NAME_TAKEN';
end $$;

create or replace function whoami(p_secret uuid) returns json
language sql stable security definer set search_path = public as $$
  select row_to_json(p) from players p join player_secrets s on s.player_id = p.id where s.secret = p_secret
$$;

create or replace function update_profile(p_secret uuid, p_name text, p_avatar text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update players set name = _clean_name(p_name), avatar = left(coalesce(p_avatar, '🙂'), 16)
  where id = _player_id(p_secret);
exception when unique_violation then
  raise exception 'NAME_TAKEN';
end $$;

create or replace function save_prediction(p_secret uuid, p_kind text, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_player uuid := _player_id(p_secret); v_phase text;
begin
  select phase into v_phase from game where id = 1;
  if length(p_payload::text) > 4000 then raise exception 'INVALID'; end if;
  if p_kind = 'chouchoute' then null;
  elsif p_kind = 'avant' and v_phase = 'accueil' then null;
  elsif p_kind = 'apres15' and v_phase in ('top15', 'maillot', 'robes') then null;
  elsif p_kind = 'final' and v_phase in ('top5', 'discours') then null;
  elsif p_kind in ('avant', 'apres15', 'final') then raise exception 'LOCKED';
  else raise exception 'INVALID';
  end if;
  insert into predictions (player_id, kind, payload) values (v_player, p_kind, p_payload)
  on conflict (player_id, kind) do update set payload = excluded.payload, updated_at = now();
end $$;

create or replace function save_rating(p_secret uuid, p_candidate text, p_round text, p_score int) returns void
language plpgsql security definer set search_path = public as $$
declare v_player uuid := _player_id(p_secret); v_phase text; v_round_phase text;
begin
  select phase into v_phase from game where id = 1;
  v_round_phase := case p_round when 'costume' then 'costumes' when 'maillot' then 'maillot'
                                when 'robe' then 'robes' when 'discours' then 'discours' end;
  if v_round_phase is null then raise exception 'INVALID'; end if;
  if v_phase = 'fin' or _phase_index(v_phase) < _phase_index(v_round_phase) then raise exception 'LOCKED'; end if;
  if coalesce(p_score, 0) = 0 then
    delete from ratings where player_id = v_player and candidate_id = p_candidate and round = p_round;
  else
    insert into ratings (player_id, candidate_id, round, score) values (v_player, p_candidate, p_round, p_score)
    on conflict (player_id, candidate_id, round) do update set score = excluded.score, updated_at = now();
  end if;
end $$;

create or replace function answer_bet(p_secret uuid, p_bet uuid, p_choice text) returns void
language plpgsql security definer set search_path = public as $$
declare v_player uuid := _player_id(p_secret); v_status text;
begin
  select status into v_status from bets where id = p_bet;
  if v_status is null then raise exception 'NOT_FOUND'; end if;
  if v_status <> 'open' then raise exception 'LOCKED'; end if;
  insert into bet_answers (bet_id, player_id, choice) values (p_bet, v_player, left(p_choice, 200))
  on conflict (bet_id, player_id) do update set choice = excluded.choice, updated_at = now();
end $$;

-- ---------------------------------------------------------------- Admin
create or replace function admin_check(p_pin text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_settings where pin = p_pin)
$$;

create or replace function admin_set_phase(p_pin text, p_phase text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  if _phase_index(p_phase) is null then raise exception 'INVALID'; end if;
  update game set phase = p_phase, updated_at = now() where id = 1;
end $$;

create or replace function admin_set_on_stage(p_pin text, p_candidate text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  update game set on_stage = p_candidate, updated_at = now() where id = 1;
end $$;

create or replace function admin_set_results(p_pin text, p_results jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  update game set results = p_results, updated_at = now() where id = 1;
end $$;

create or replace function admin_create_bet(p_pin text, p_question text, p_type text, p_options jsonb, p_points int) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform _check_pin(p_pin);
  insert into bets (question, type, options, points) values (p_question, p_type, coalesce(p_options, '[]'::jsonb), coalesce(p_points, 3))
  returning id into v;
  return v;
end $$;

create or replace function admin_update_bet(p_pin text, p_id uuid, p_status text, p_answer text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  update bets set status = p_status, answer = p_answer where id = p_id;
end $$;

create or replace function admin_delete_bet(p_pin text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  delete from bets where id = p_id;
end $$;

create or replace function admin_rename_player(p_pin text, p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  update players set name = _clean_name(p_name) where id = p_id;
exception when unique_violation then
  raise exception 'NAME_TAKEN';
end $$;

create or replace function admin_delete_player(p_pin text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  delete from players where id = p_id;
end $$;

create or replace function admin_player_secret(p_pin text, p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform _check_pin(p_pin);
  select secret into v from player_secrets where player_id = p_id;
  if v is null then raise exception 'NOT_FOUND'; end if;
  return v;
end $$;

create or replace function admin_reset(p_pin text, p_keep_players boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _check_pin(p_pin);
  delete from bet_answers where true;
  delete from bets where true;
  delete from ratings where true;
  delete from predictions where true;
  if not p_keep_players then delete from players where true; end if;
  update game set phase = 'accueil', on_stage = null,
    results = '{"top15":[],"top5":[],"verdict":[]}'::jsonb, updated_at = now() where id = 1;
end $$;

-- ---------------------------------------------------------------- Droits d'accès
-- Les projets Supabase récents n'ouvrent plus forcément les nouvelles tables au public :
-- on donne explicitement la lecture des tables de jeu et l'exécution des fonctions.
grant usage on schema public to anon, authenticated;
grant select on game, players, predictions, ratings, bets, bet_answers to anon, authenticated;
revoke all on admin_settings, player_secrets from anon, authenticated;
grant execute on function
  join_game(text, text),
  whoami(uuid),
  update_profile(uuid, text, text),
  save_prediction(uuid, text, jsonb),
  save_rating(uuid, text, text, int),
  answer_bet(uuid, uuid, text),
  admin_check(text),
  admin_set_phase(text, text),
  admin_set_on_stage(text, text),
  admin_set_results(text, jsonb),
  admin_create_bet(text, text, text, jsonb, int),
  admin_update_bet(text, uuid, text, text),
  admin_delete_bet(text, uuid),
  admin_rename_player(text, uuid, text),
  admin_delete_player(text, uuid),
  admin_player_secret(text, uuid),
  admin_reset(text, boolean)
to anon, authenticated;
