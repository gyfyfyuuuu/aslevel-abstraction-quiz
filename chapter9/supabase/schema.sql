-- Run in the Supabase SQL Editor. The browser receives only the anon key.
create extension if not exists pgcrypto;

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  student_code char(4) unique not null,
  created_at timestamptz not null default now()
);
create table if not exists public.student_progress (
  student_id uuid primary key references public.student_profiles(id) on delete cascade,
  current_level smallint not null default 1 check (current_level between 1 and 3),
  current_question smallint not null default 1 check (current_question between 1 and 10),
  total_score integer not null default 0 check (total_score between 0 and 600),
  completed_levels smallint[] not null default '{}',
  failed boolean not null default false,
  challenge_started_at timestamptz not null default now(),
  challenge_completed boolean not null default false,
  completed_at timestamptz,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  question_started_at timestamptz not null default now(),
  active_seconds integer not null default 0 check(active_seconds >= 0)
);
create table if not exists public.answer_keys (
  question_id text primary key,
  level smallint not null check(level between 1 and 3),
  answer char(1) not null check(answer in ('A','B','C','D'))
);
insert into public.answer_keys(question_id,level,answer) values
('L1Q01',1,'B'),('L1Q02',1,'B'),('L1Q03',1,'C'),('L1Q04',1,'C'),('L1Q05',1,'B'),('L1Q06',1,'B'),('L1Q07',1,'C'),('L1Q08',1,'A'),('L1Q09',1,'B'),('L1Q10',1,'B'),
('L2Q11',2,'B'),('L2Q12',2,'A'),('L2Q13',2,'C'),('L2Q14',2,'C'),('L2Q15',2,'C'),('L2Q16',2,'B'),('L2Q17',2,'B'),('L2Q18',2,'B'),('L2Q19',2,'B'),('L2Q20',2,'A'),
('L3Q21',3,'B'),('L3Q22',3,'D'),('L3Q23',3,'C'),('L3Q24',3,'A'),('L3Q25',3,'B'),('L3Q26',3,'B'),('L3Q27',3,'B'),('L3Q28',3,'B'),('L3Q29',3,'C'),('L3Q30',3,'B')
on conflict(question_id) do update set answer=excluded.answer,level=excluded.level;

create or replace function public.make_student_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare new_code text;
begin
  loop
    new_code := (1000 + floor(random()*9000))::int::text;
    exit when not exists(select 1 from public.student_profiles where student_code=new_code);
  end loop;
  insert into public.student_profiles(id,display_name,student_code) values(new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Student'), new_code);
  insert into public.student_progress(student_id) values(new.id);
  return new;
end $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute procedure public.make_student_profile();

create or replace function public.submit_quiz_answer(p_question_id text,p_answer text,p_remaining_seconds integer default 0,p_timeout boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.student_progress%rowtype; k public.answer_keys%rowtype; ok boolean; pts integer; max_sec integer; now_at timestamptz:=clock_timestamp();
begin
  if uid is null then raise exception 'Sign in required'; end if;
  select * into p from public.student_progress where student_id=uid for update;
  if p.challenge_completed or p.failed then raise exception 'Restart the current level before answering'; end if;
  if p_question_id !~ '^L[1-3]Q(0[1-9]|[12][0-9]|30)$' then raise exception 'Invalid question'; end if;
  if substring(p_question_id from 2 for 1)::int <> p.current_level or substring(p_question_id from 4)::int <> p.current_question then raise exception 'Question is not current'; end if;
  select * into k from public.answer_keys where question_id=p_question_id;
  max_sec:=case p.current_level when 1 then 40 when 2 then 90 else 150 end;
  -- Server clock rejects a submission after the server-side deadline.
  if now_at > p.question_started_at + make_interval(secs=>max_sec) then p_timeout:=true; end if;
  ok:=not p_timeout and p_answer=k.answer;
  if not ok then
    update public.student_progress set failed=true,current_question=1,question_started_at=now_at,active_seconds=active_seconds+least(max_sec,greatest(0,extract(epoch from (now_at-question_started_at))::int)) where student_id=uid returning * into p;
  else
    pts:=case p.current_level when 1 then 10 when 2 then 20 else 30 end;
    p.active_seconds:=p.active_seconds+least(max_sec,greatest(0,extract(epoch from (now_at-p.question_started_at))::int));
    if p.current_question=10 then
      update public.student_progress set total_score=total_score+pts,completed_levels=array_append(completed_levels,p.current_level),current_level=least(3,p.current_level+1),current_question=1,failed=false,question_started_at=now_at,active_seconds=p.active_seconds,challenge_completed=(p.current_level=3),completed_at=case when p.current_level=3 then now_at else null end,elapsed_seconds=case when p.current_level=3 then p.active_seconds else 0 end where student_id=uid returning * into p;
    else
      update public.student_progress set total_score=total_score+pts,current_question=current_question+1,question_started_at=now_at,active_seconds=p.active_seconds where student_id=uid returning * into p;
    end if;
  end if;
  return jsonb_build_object('correct',ok,'level_complete',ok and p.current_question=1 and p.completed_levels @> array[k.level]::smallint[],'level',k.level,'progress',to_jsonb(p));
end $$;

create or replace function public.resume_quiz_question()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.student_progress%rowtype;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 update public.student_progress set question_started_at=clock_timestamp() where student_id=uid and failed=false and challenge_completed=false returning * into p;
 if not found then raise exception 'No active question'; end if;
 return to_jsonb(p);
end $$;
revoke all on function public.resume_quiz_question() from public,anon;
grant execute on function public.resume_quiz_question() to authenticated;

alter table public.student_profiles enable row level security;
alter table public.student_progress enable row level security;
alter table public.answer_keys enable row level security;
drop policy if exists profile_owner_read on public.student_profiles;
create policy profile_owner_read on public.student_profiles for select to authenticated using(id=auth.uid());
drop policy if exists progress_owner_all on public.student_progress;
create policy progress_owner_all on public.student_progress for select to authenticated using(student_id=auth.uid());
-- No client write policies. Only the trigger and SECURITY DEFINER RPC may change progress.
revoke all on public.answer_keys from anon,authenticated;
revoke all on function public.submit_quiz_answer(text,text,integer,boolean) from public,anon;
grant execute on function public.submit_quiz_answer(text,text,integer,boolean) to authenticated;
revoke insert,update,delete on public.student_progress from anon,authenticated;
revoke insert,update,delete on public.student_profiles from anon,authenticated;

create or replace function public.start_quiz_level(p_level integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.student_progress%rowtype;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select * into p from public.student_progress where student_id=uid for update;
 if p_level not between 1 and 3 or p_level<>p.current_level or p_level=any(p.completed_levels) or p.challenge_completed then raise exception 'That level is locked or already completed'; end if;
 update public.student_progress set current_level=p_level,current_question=case when failed then 1 else current_question end,failed=false,question_started_at=clock_timestamp() where student_id=uid returning * into p;
 return to_jsonb(p);
end $$;
revoke all on function public.start_quiz_level(integer) from public,anon;
grant execute on function public.start_quiz_level(integer) to authenticated;

create or replace view public.public_leaderboard as
select display_name,total_score,completed_at,elapsed_seconds from public.student_profiles sp join public.student_progress pr on pr.student_id=sp.id where pr.challenge_completed=true;
grant select on public.public_leaderboard to anon,authenticated;

