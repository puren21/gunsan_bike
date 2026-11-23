-- Independent Point dataset. Matches the existing Gunsan road editor authorization.
create table if not exists public.gunsan_bike_rack_datasets (
 id text primary key check (id='gunsan_bike_racks'),
 data jsonb not null check(data->>'type'='FeatureCollection' and jsonb_typeof(data->'features')='array'),
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.gunsan_bike_rack_datasets enable row level security;
revoke all on public.gunsan_bike_rack_datasets from anon,authenticated;
grant select on public.gunsan_bike_rack_datasets to anon,authenticated;
create policy gunsan_racks_public_read on public.gunsan_bike_rack_datasets for select to anon,authenticated using(true);
create table if not exists public.gunsan_bike_rack_history (
 revision bigint primary key,data jsonb not null,saved_at timestamptz not null,saved_by uuid
);
alter table public.gunsan_bike_rack_history enable row level security;
revoke all on public.gunsan_bike_rack_history from anon,authenticated;
grant select on public.gunsan_bike_rack_history to authenticated;
create policy gunsan_racks_editor_history on public.gunsan_bike_rack_history for select to authenticated using((select auth.uid())='6e9d97d9-f7b3-4920-91e3-080c3a90c0dd'::uuid);
insert into public.gunsan_bike_rack_datasets(id,data) values('gunsan_bike_racks','{"type":"FeatureCollection","features":[]}'::jsonb) on conflict(id) do nothing;
-- Definer is required to atomically write the protected dataset + append-only history.
-- No direct client write grants; authorize the existing editor UID before any write.
create or replace function public.save_gunsan_bike_racks(p_data jsonb,p_revision bigint)
returns setof public.gunsan_bike_rack_datasets language plpgsql security definer set search_path=public,pg_temp as $$
declare current_row public.gunsan_bike_rack_datasets; f jsonb; p jsonb; c jsonb; k text;
begin
 if auth.uid() is distinct from '6e9d97d9-f7b3-4920-91e3-080c3a90c0dd'::uuid then raise exception '편집 계정으로 로그인하세요.' using errcode='42501';end if;
 if p_data->>'type' is distinct from 'FeatureCollection' or jsonb_typeof(p_data->'features') is distinct from 'array' then raise exception '보관대 GeoJSON 형식이 올바르지 않습니다.';end if;
 for f in select value from jsonb_array_elements(p_data->'features') loop
  p:=f->'properties';c:=f->'geometry'->'coordinates';
  if f->>'type' is distinct from 'Feature' or f->'geometry'->>'type' is distinct from 'Point' or jsonb_typeof(c) is distinct from 'array' then raise exception '보관대는 포인트 형식이어야 합니다.';end if;
  if jsonb_array_length(c)<>2 or jsonb_typeof(c->0) is distinct from 'number' or jsonb_typeof(c->1) is distinct from 'number' then raise exception '보관대 좌표가 올바르지 않습니다.';end if;
  if abs((c->>0)::numeric)>180 or abs((c->>1)::numeric)>90 then raise exception 'EPSG:4326 경위도 좌표를 사용하세요.';end if;
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'명칭') is distinct from 'string' or btrim(coalesce(p->>'명칭',''))='' or length(p->>'명칭')>120 or coalesce(p->>'__rack_id','')='' then raise exception '보관대 명칭과 식별자를 확인하세요.';end if;
  if length(coalesce(p->>'위치',''))>500 or length(coalesce(p->>'형식',''))>100 then raise exception '보관대 속성 길이를 확인하세요.';end if;
  foreach k in array array['보관대수','주차대수'] loop
   if coalesce(p->>k,'')<>'' and (p->>k)!~'^[0-9]+$' then raise exception '보관대수와 주차대수는 0 이상의 정수여야 합니다.';end if;
  end loop;
 end loop;
 if (select count(*) from jsonb_array_elements(p_data->'features'))<>(select count(distinct value->'properties'->>'__rack_id') from jsonb_array_elements(p_data->'features')) then raise exception '보관대 식별자가 중복되었습니다.';end if;
 perform pg_advisory_xact_lock(73194202);
 select * into current_row from public.gunsan_bike_rack_datasets where id='gunsan_bike_racks' for update;
 if p_revision is null or coalesce(current_row.revision,0)<>p_revision then raise exception '다른 컴퓨터에서 보관대를 먼저 저장했습니다. 현재 작업을 내보낸 뒤 새로고침하세요.' using errcode='40001';end if;
 if current_row.id is not null then insert into public.gunsan_bike_rack_history values(current_row.revision,current_row.data,current_row.updated_at,current_row.updated_by);end if;
 return query insert into public.gunsan_bike_rack_datasets(id,data,revision,updated_at,updated_by) values('gunsan_bike_racks',p_data,p_revision+1,now(),auth.uid()) on conflict(id) do update set data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at,updated_by=excluded.updated_by returning *;
end;
$$;
revoke all on function public.save_gunsan_bike_racks(jsonb,bigint) from public,anon;
grant execute on function public.save_gunsan_bike_racks(jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
create schema if not exists gunsan_private;
revoke all on schema gunsan_private from public,anon;
grant usage on schema gunsan_private to authenticated;
alter function public.save_gunsan_bike_racks(jsonb,bigint) set schema gunsan_private;
revoke all on function gunsan_private.save_gunsan_bike_racks(jsonb,bigint) from public,anon;
grant execute on function gunsan_private.save_gunsan_bike_racks(jsonb,bigint) to authenticated;
create function public.save_gunsan_bike_racks(p_data jsonb,p_revision bigint)
returns setof public.gunsan_bike_rack_datasets language sql security invoker set search_path='' as $$ select * from gunsan_private.save_gunsan_bike_racks(p_data,p_revision); $$;
revoke all on function public.save_gunsan_bike_racks(jsonb,bigint) from public,anon;
grant execute on function public.save_gunsan_bike_racks(jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
