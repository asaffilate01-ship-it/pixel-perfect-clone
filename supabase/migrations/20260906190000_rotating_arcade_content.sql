-- Database-backed Crossword and Higher/Lower pools with per-player anti-repeat rotation.
create table if not exists public.crossword_puzzles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sport_label text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  grid_size smallint not null default 9 check (grid_size between 7 and 15),
  entries jsonb not null check (jsonb_typeof(entries)='array' and jsonb_array_length(entries)>=4),
  source_url text not null check (source_url ~ '^https://'),
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.higher_lower_cards (
  id uuid primary key default gen_random_uuid(),
  sport_label text not null,
  metric_key text not null,
  metric_label text not null,
  name text not null,
  value_numeric numeric not null,
  display_value text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  verified boolean not null default false,
  active boolean not null default true,
  unique(metric_key,name)
);

create table if not exists public.arcade_content_exposures (
  user_id uuid not null references auth.users on delete cascade,
  content_type text not null check(content_type in ('crossword','higher-lower')),
  content_id uuid not null,
  exposed_at timestamptz not null default now()
);
create index if not exists arcade_content_recent on public.arcade_content_exposures(user_id,content_type,exposed_at desc);

alter table public.crossword_puzzles enable row level security;
alter table public.higher_lower_cards enable row level security;
alter table public.arcade_content_exposures enable row level security;
grant select on public.crossword_puzzles, public.higher_lower_cards to authenticated;
grant select,insert on public.arcade_content_exposures to authenticated;
grant all on public.crossword_puzzles, public.higher_lower_cards, public.arcade_content_exposures to service_role;
create policy "verified crosswords readable" on public.crossword_puzzles for select to authenticated using(verified and active);
create policy "verified comparisons readable" on public.higher_lower_cards for select to authenticated using(verified and active);
create policy "own arcade exposures" on public.arcade_content_exposures for select to authenticated using(user_id=auth.uid());
create policy "own arcade exposure insert" on public.arcade_content_exposures for insert to authenticated with check(user_id=auth.uid());

insert into public.crossword_puzzles(title,sport_label,difficulty,entries,source_url,verified) values
('Sporting Essentials','Mixed sports',1,'[{"answer":"WICKET","clue":"Three stumps used as a target in cricket","row":2,"col":1},{"answer":"ICE","clue":"Frozen surface used for skating and ice hockey","row":2,"col":2,"vertical":true},{"answer":"TENNIS","clue":"Sport played at Wimbledon","row":1,"col":5,"vertical":true},{"answer":"ARENA","clue":"A venue for sporting contests","row":7,"col":2}]','https://olympics.com/en/sports/',true),
('Football World','Football',1,'[{"answer":"ARSENAL","clue":"North London club nicknamed the Gunners","row":2,"col":1},{"answer":"BRAZIL","clue":"Five-time men''s world champions through 2022","row":1,"col":2,"vertical":true},{"answer":"ENGLAND","clue":"Winners of the 1966 men''s World Cup","row":2,"col":4,"vertical":true},{"answer":"VAR","clue":"Initialism for football''s video review official","row":7,"col":1}]','https://www.fifa.com/tournaments/mens/worldcup',true),
('Court Craft','Tennis',2,'[{"answer":"TENNIS","clue":"The sport contested at all four Grand Slams","row":3,"col":1},{"answer":"NET","clue":"It divides the court","row":2,"col":2,"vertical":true},{"answer":"WIN","clue":"The result earned by the match victor","row":2,"col":5,"vertical":true},{"answer":"DEUCE","clue":"A score of forty-all","row":7,"col":2}]','https://www.itftennis.com/en/about-us/organisation/rules-and-regulations/rules-of-tennis/',true),
('Cricket Terms','Cricket',2,'[{"answer":"BOWLER","clue":"Player who delivers the ball","row":2,"col":1},{"answer":"OUT","clue":"The batter has been dismissed","row":2,"col":2,"vertical":true},{"answer":"EDGE","clue":"Contact with the side of the bat","row":2,"col":5,"vertical":true},{"answer":"CREASE","clue":"Marked line near each wicket","row":7,"col":1}]','https://www.lords.org/mcc/the-laws-of-cricket',true),
('Champion Vocabulary','Mixed sports',3,'[{"answer":"PELOTON","clue":"The main group of riders in a road race","row":2,"col":1},{"answer":"POLE","clue":"The leading starting position in motor racing","row":2,"col":1,"vertical":true},{"answer":"OMNIUM","clue":"Multi-race track-cycling competition","row":2,"col":4,"vertical":true},{"answer":"EAGLE","clue":"Two under par on a golf hole","row":8,"col":2}]','https://olympics.com/en/sports/',true),
('Expert Sporting Lexicon','Mixed sports',4,'[{"answer":"SCRUMMAGE","clue":"An American-football play begins at its line","row":2,"col":0},{"answer":"ICE","clue":"Frozen playing surface used in ice hockey","row":1,"col":1,"vertical":true},{"answer":"MEDAL","clue":"Award earned by an Olympic podium finisher","row":2,"col":5,"vertical":true},{"answer":"OMNIUM","clue":"Multi-race track-cycling competition","row":8,"col":2}]','https://olympics.com/en/sports/',true)
on conflict do nothing;

-- Values are deliberately tied to fixed career totals or stated historical cut-offs.
insert into public.higher_lower_cards(sport_label,metric_key,metric_label,name,value_numeric,display_value,difficulty,source_url,source_title,verified) values
('Football','mens-world-cup-titles-2022','Men''s World Cup titles through 2022','Brazil',5,'5',1,'https://www.fifa.com/tournaments/mens/worldcup','FIFA World Cup history',true),
('Football','mens-world-cup-titles-2022','Men''s World Cup titles through 2022','Germany',4,'4',1,'https://www.fifa.com/tournaments/mens/worldcup','FIFA World Cup history',true),
('Football','mens-world-cup-titles-2022','Men''s World Cup titles through 2022','Italy',4,'4',1,'https://www.fifa.com/tournaments/mens/worldcup','FIFA World Cup history',true),
('Football','mens-world-cup-titles-2022','Men''s World Cup titles through 2022','Argentina',3,'3',1,'https://www.fifa.com/tournaments/mens/worldcup','FIFA World Cup history',true),
('Football','mens-world-cup-titles-2022','Men''s World Cup titles through 2022','France',2,'2',1,'https://www.fifa.com/tournaments/mens/worldcup','FIFA World Cup history',true),
('Golf','mens-major-titles','Men''s major titles','Jack Nicklaus',18,'18',2,'https://www.pgatour.com/article/news/latest/2024/05/20/most-major-championship-wins-in-pga-tour-history-tiger-woods-jack-nicklaus-brooks-koepka-rory-mcilroy','PGA Tour major wins',true),
('Golf','mens-major-titles','Men''s major titles','Tiger Woods',15,'15',2,'https://www.pgatour.com/article/news/latest/2024/05/20/most-major-championship-wins-in-pga-tour-history-tiger-woods-jack-nicklaus-brooks-koepka-rory-mcilroy','PGA Tour major wins',true),
('Golf','mens-major-titles','Men''s major titles','Ben Hogan',9,'9',2,'https://www.pgatour.com/article/news/latest/2024/05/20/most-major-championship-wins-in-pga-tour-history-tiger-woods-jack-nicklaus-brooks-koepka-rory-mcilroy','PGA Tour major wins',true),
('Golf','mens-major-titles','Men''s major titles','Gary Player',9,'9',2,'https://www.pgatour.com/article/news/latest/2024/05/20/most-major-championship-wins-in-pga-tour-history-tiger-woods-jack-nicklaus-brooks-koepka-rory-mcilroy','PGA Tour major wins',true),
('Golf','mens-major-titles','Men''s major titles','Tom Watson',8,'8',2,'https://www.pgatour.com/article/news/latest/2024/05/20/most-major-championship-wins-in-pga-tour-history-tiger-woods-jack-nicklaus-brooks-koepka-rory-mcilroy','PGA Tour major wins',true),
('Formula 1','f1-wins-2013','Grand Prix wins through 2013','Michael Schumacher',91,'91',3,'https://www.formula1.com/en/results/drivers','Formula 1 driver results',true),
('Formula 1','f1-wins-2013','Grand Prix wins through 2013','Sebastian Vettel',39,'39',3,'https://www.formula1.com/en/results/drivers','Formula 1 driver results',true),
('Formula 1','f1-wins-2013','Grand Prix wins through 2013','Alain Prost',51,'51',3,'https://www.formula1.com/en/results/drivers','Formula 1 driver results',true),
('Formula 1','f1-wins-2013','Grand Prix wins through 2013','Ayrton Senna',41,'41',3,'https://www.formula1.com/en/results/drivers','Formula 1 driver results',true),
('Formula 1','f1-wins-2013','Grand Prix wins through 2013','Nigel Mansell',31,'31',3,'https://www.formula1.com/en/results/drivers','Formula 1 driver results',true),
('Cricket','retired-test-runs','Test career runs','Sachin Tendulkar',15921,'15,921',4,'https://www.icc-cricket.com/rankings/batting/all-time-test','ICC Test batting records',true),
('Cricket','retired-test-runs','Test career runs','Ricky Ponting',13378,'13,378',4,'https://www.icc-cricket.com/rankings/batting/all-time-test','ICC Test batting records',true),
('Cricket','retired-test-runs','Test career runs','Jacques Kallis',13289,'13,289',4,'https://www.icc-cricket.com/rankings/batting/all-time-test','ICC Test batting records',true),
('Cricket','retired-test-runs','Test career runs','Rahul Dravid',13288,'13,288',4,'https://www.icc-cricket.com/rankings/batting/all-time-test','ICC Test batting records',true),
('Cricket','retired-test-runs','Test career runs','Alastair Cook',12472,'12,472',4,'https://www.icc-cricket.com/rankings/batting/all-time-test','ICC Test batting records',true)
on conflict(metric_key,name) do update set value_numeric=excluded.value_numeric,display_value=excluded.display_value,verified=true;

create or replace function public.reserve_crossword_puzzle(p_difficulty smallint default 2)
returns jsonb language plpgsql security definer set search_path=public as $$
declare chosen public.crossword_puzzles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_difficulty not between 1 and 4 then raise exception 'Invalid difficulty'; end if;
  select p.* into chosen from public.crossword_puzzles p
  where p.active and p.verified and p.difficulty=p_difficulty
    and not exists(select 1 from public.arcade_content_exposures e where e.user_id=auth.uid() and e.content_type='crossword' and e.content_id=p.id and e.exposed_at>now()-interval '120 days')
  order by random() limit 1;
  if chosen.id is null then select p.* into chosen from public.crossword_puzzles p where p.active and p.verified and p.difficulty=p_difficulty order by random() limit 1; end if;
  if chosen.id is null then return null; end if;
  insert into public.arcade_content_exposures(user_id,content_type,content_id) values(auth.uid(),'crossword',chosen.id);
  return jsonb_build_object('id',chosen.id,'title',chosen.title,'sport_label',chosen.sport_label,'difficulty',chosen.difficulty,'grid_size',chosen.grid_size,'entries',chosen.entries);
end $$;

create or replace function public.reserve_higher_lower_cards(p_difficulty smallint default 2,p_limit int default 40)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_difficulty not between 1 and 4 then raise exception 'Invalid difficulty'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'value',x.value_numeric,'display_value',x.display_value,'metric_label',x.metric_label,'sport_label',x.sport_label)),'[]'::jsonb)
  into result from (
    select c.* from public.higher_lower_cards c
    where c.active and c.verified and c.difficulty=p_difficulty
      and not exists (
        select 1 from public.arcade_content_exposures e
        where e.user_id=auth.uid() and e.content_type='higher-lower'
          and e.content_id=c.id and e.exposed_at>now()-interval '30 days'
      )
    order by random() limit least(greatest(p_limit,4),100)
  ) x;
  if jsonb_array_length(result) < 4 then
    select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'value',x.value_numeric,'display_value',x.display_value,'metric_label',x.metric_label,'sport_label',x.sport_label)),'[]'::jsonb)
    into result from (select c.* from public.higher_lower_cards c where c.active and c.verified and c.difficulty=p_difficulty order by random() limit least(greatest(p_limit,4),100)) x;
  end if;
  insert into public.arcade_content_exposures(user_id,content_type,content_id)
    select auth.uid(),'higher-lower',(v->>'id')::uuid from jsonb_array_elements(result) v;
  return result;
end $$;
revoke all on function public.reserve_crossword_puzzle(smallint),public.reserve_higher_lower_cards(smallint,int) from public,anon;
grant execute on function public.reserve_crossword_puzzle(smallint),public.reserve_higher_lower_cards(smallint,int) to authenticated,service_role;

-- Explicit million-question balance: 250,000 publishable rows in every difficulty.
select public.create_question_content_campaign('Verified sports questions — Easy 250,000',250000,10000);
select public.create_question_content_campaign('Verified sports questions — Medium 250,000',250000,10000);
select public.create_question_content_campaign('Verified sports questions — Hard 250,000',250000,10000);
select public.create_question_content_campaign('Verified sports questions — Expert 250,000',250000,10000);
