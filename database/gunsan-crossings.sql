-- Independent bicycle crossing Point data, with the existing editor authorization.
create table public.gunsan_bike_crossing_datasets (
 id text primary key check(id='gunsan_bike_crossings'),
 data jsonb not null check(data->>'type'='FeatureCollection' and jsonb_typeof(data->'features')='array'),
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.gunsan_bike_crossing_datasets enable row level security;
revoke all on public.gunsan_bike_crossing_datasets from anon,authenticated;
grant select on public.gunsan_bike_crossing_datasets to anon,authenticated;
create policy gunsan_crossings_public_read on public.gunsan_bike_crossing_datasets for select to anon,authenticated using(true);
create table public.gunsan_bike_crossing_history (revision bigint primary key,data jsonb not null,saved_at timestamptz not null,saved_by uuid);
alter table public.gunsan_bike_crossing_history enable row level security;
revoke all on public.gunsan_bike_crossing_history from anon,authenticated;
grant select on public.gunsan_bike_crossing_history to authenticated;
create policy gunsan_crossings_editor_history on public.gunsan_bike_crossing_history for select to authenticated using((select auth.uid())='6e9d97d9-f7b3-4920-91e3-080c3a90c0dd'::uuid);
insert into public.gunsan_bike_crossing_datasets(id,data) values('gunsan_bike_crossings','{"type":"FeatureCollection","features":[]}'::jsonb);
-- Private writer keeps history append-only and denies direct client writes.
create function gunsan_private.save_gunsan_bike_crossings(p_data jsonb,p_revision bigint)
returns setof public.gunsan_bike_crossing_datasets language plpgsql security definer set search_path=public,pg_temp as $$
declare current_row public.gunsan_bike_crossing_datasets;f jsonb;p jsonb;c jsonb;
begin
 if auth.uid() is distinct from '6e9d97d9-f7b3-4920-91e3-080c3a90c0dd'::uuid then raise exception '편집 계정으로 로그인하세요.' using errcode='42501';end if;
 if p_data->>'type' is distinct from 'FeatureCollection' or jsonb_typeof(p_data->'features') is distinct from 'array' then raise exception '횡단도로 GeoJSON 형식이 올바르지 않습니다.';end if;
 for f in select value from jsonb_array_elements(p_data->'features') loop
  p:=f->'properties';c:=f->'geometry'->'coordinates';
  if f->>'type' is distinct from 'Feature' or f->'geometry'->>'type' is distinct from 'Point' or jsonb_typeof(c) is distinct from 'array' then raise exception '횡단도로는 포인트 형식이어야 합니다.';end if;
  if jsonb_array_length(c)<>2 or jsonb_typeof(c->0) is distinct from 'number' or jsonb_typeof(c->1) is distinct from 'number' then raise exception '횡단도로 좌표가 올바르지 않습니다.';end if;
  if abs((c->>0)::numeric)>180 or abs((c->>1)::numeric)>90 then raise exception 'EPSG:4326 경위도 좌표를 사용하세요.';end if;
  if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'차로') is distinct from 'string' or length(p->>'차로')>100 or jsonb_typeof(p->'__crossing_id') is distinct from 'string' or btrim(coalesce(p->>'__crossing_id',''))='' then raise exception '차로와 횡단도로 식별자를 확인하세요.';end if;
  if exists(select 1 from jsonb_object_keys(p) k where k not in ('차로','__crossing_id')) then raise exception '횡단도로에는 차로 속성만 저장할 수 있습니다.';end if;
 end loop;
 if (select count(*) from jsonb_array_elements(p_data->'features'))<>(select count(distinct value->'properties'->>'__crossing_id') from jsonb_array_elements(p_data->'features')) then raise exception '횡단도로 식별자가 중복되었습니다.';end if;
 perform pg_advisory_xact_lock(73194203);
 select * into current_row from public.gunsan_bike_crossing_datasets where id='gunsan_bike_crossings' for update;
 if p_revision is null or coalesce(current_row.revision,0)<>p_revision then raise exception '다른 컴퓨터에서 횡단도로를 먼저 저장했습니다. 내보낸 뒤 새로고침하세요.' using errcode='40001';end if;
 insert into public.gunsan_bike_crossing_history values(current_row.revision,current_row.data,current_row.updated_at,current_row.updated_by);
 return query update public.gunsan_bike_crossing_datasets set data=p_data,revision=p_revision+1,updated_at=now(),updated_by=auth.uid() where id='gunsan_bike_crossings' returning *;
end;
$$;
revoke all on function gunsan_private.save_gunsan_bike_crossings(jsonb,bigint) from public,anon;
grant execute on function gunsan_private.save_gunsan_bike_crossings(jsonb,bigint) to authenticated;
create function public.save_gunsan_bike_crossings(p_data jsonb,p_revision bigint)
returns setof public.gunsan_bike_crossing_datasets language sql security invoker set search_path='' as $$ select * from gunsan_private.save_gunsan_bike_crossings(p_data,p_revision); $$;
revoke all on function public.save_gunsan_bike_crossings(jsonb,bigint) from public,anon;
grant execute on function public.save_gunsan_bike_crossings(jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
