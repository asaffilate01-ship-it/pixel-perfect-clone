insert into public.sports(slug,name,accent,sort_order) values
('football','Football','#41E59B',1),
('cricket','Cricket','#F4C95D',2),
('rugby','Rugby','#FF815A',3),
('afl','Aussie Rules','#BF8CFF',4),
('nfl','NFL','#FF6B76',5),
('mlb','MLB','#5DB8FF',6),
('nhl','NHL','#90D7FF',7),
('nba','NBA','#FF9E52',8),
('golf','Golf','#65DC7B',9),
('tennis','Tennis','#E9F55B',10) on conflict (slug) do nothing;

insert into public.athletes(sport_id,name,aliases)
select s.id, v.name, v.aliases from public.sports s,
 (values ('Alex Song','{}'::text[]),('Alexis Sanchez',array['Sanchez']::text[]),('Andres Iniesta',array['Iniesta']::text[]),('Ashley Cole','{}'::text[]),('Cesc Fabregas',array['Francesc Fabregas','Fabregas']::text[]),('Claude Makelele',array['Claude Makelele','Makelele']::text[]),('Didier Drogba','{}'::text[]),('Diego Milito','{}'::text[]),('Emmanuel Adebayor','{}'::text[]),('Emmanuel Petit','{}'::text[]),('Frank Lampard','{}'::text[]),('Hugo Lloris','{}'::text[]),('John Terry','{}'::text[]),('Julio Cesar',array['Julio Cesar']::text[]),('Karim Benzema','{}'::text[]),('Laurent Koscielny','{}'::text[]),('Lionel Messi',array['Messi','Leo Messi']::text[]),('Maicon','{}'::text[]),('Marc Overmars','{}'::text[]),('N''Golo Kante',array['Ngolo Kante','Kante']::text[]),('Olivier Giroud','{}'::text[]),('Patrick Vieira','{}'::text[]),('Petr Cech',array['Cech']::text[]),('Raphael Varane',array['Varane']::text[]),('Rivaldo','{}'::text[]),('Robert Pires','{}'::text[]),('Samuel Eto''o',array['Etoo','Eto o','Samuel Etoo']::text[]),('Thierry Henry',array['Henry']::text[]),('Wesley Sneijder',array['Sneijder']::text[]),('William Gallas','{}'::text[]),('William Saliba','{}'::text[]),('Xavi','{}'::text[]),('Yaya Toure',array['Toure','Yaya Toure']::text[]),('Zinedine Zidane',array['Zidane','Zizou']::text[])) as v(name,aliases)
 where s.slug = 'football' on conflict (sport_id,name) do nothing;

insert into public.criteria(sport_id,label,criteria_type)
select s.id, v.label, 'career' from public.sports s,
 (values ('Played for Arsenal'),('Won the Champions League'),('100+ Premier League appearances'),('Played for Barcelona'),('Represented France'),('Managed by Jose Mourinho')) as v(label)
 where s.slug = 'football' on conflict (sport_id,label) do nothing;

insert into public.grids(sport_id,row_criteria,column_criteria,difficulty,scheduled_for,published_at)
select s.id,
 array[(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='football' and c.label='Played for Arsenal'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='football' and c.label='Won the Champions League'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='football' and c.label='100+ Premier League appearances')],
 array[(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='football' and c.label='Played for Barcelona'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='football' and c.label='Represented France'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='football' and c.label='Managed by Jose Mourinho')],
 3, date '2026-09-01', now()
from public.sports s where s.slug = 'football'
on conflict (sport_id,scheduled_for) do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 0::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Thierry Henry','Cesc Fabregas','Alex Song','Marc Overmars','Emmanuel Petit')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 1::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Thierry Henry','Patrick Vieira','Robert Pires','Olivier Giroud','William Saliba','Laurent Koscielny')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 2::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Petr Cech','Ashley Cole','William Gallas','Emmanuel Adebayor')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 3::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Lionel Messi','Xavi','Andres Iniesta','Samuel Eto''o','Rivaldo')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 4::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Zinedine Zidane','Karim Benzema','Raphael Varane','Claude Makelele')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 5::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Wesley Sneijder','Diego Milito','Samuel Eto''o','Maicon','Julio Cesar')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 6::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Thierry Henry','Cesc Fabregas','Yaya Toure','Alexis Sanchez')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 7::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Thierry Henry','Patrick Vieira','Olivier Giroud','Hugo Lloris','N''Golo Kante','Laurent Koscielny')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 8::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'football' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Frank Lampard','John Terry','Didier Drogba','Petr Cech','Ashley Cole')
on conflict do nothing;

insert into public.athletes(sport_id,name,aliases)
select s.id, v.name, v.aliases from public.sports s,
 (values ('Alonzo Mourning','{}'::text[]),('Anthony Davis',array['AD']::text[]),('Chris Bosh','{}'::text[]),('Dwight Howard','{}'::text[]),('Dwyane Wade','{}'::text[]),('Gary Payton','{}'::text[]),('Giannis Antetokounmpo',array['Giannis']::text[]),('Jimmy Butler','{}'::text[]),('Kareem Abdul-Jabbar',array['Kareem','Abdul Jabbar']::text[]),('Kobe Bryant',array['Kobe']::text[]),('LeBron James',array['Lebron','King James']::text[]),('Magic Johnson',array['Earvin Johnson','Magic']::text[]),('Rajon Rondo','{}'::text[]),('Ray Allen','{}'::text[]),('Russell Westbrook','{}'::text[]),('Shaquille O''Neal',array['Shaq','Shaquille ONeal']::text[]),('Stephen Curry',array['Steph Curry','Curry']::text[]),('Tim Duncan','{}'::text[]),('Udonis Haslem','{}'::text[])) as v(name,aliases)
 where s.slug = 'nba' on conflict (sport_id,name) do nothing;

insert into public.criteria(sport_id,label,criteria_type)
select s.id, v.label, 'career' from public.sports s,
 (values ('Played for the Lakers'),('NBA Champion'),('NBA All-Star'),('Played for the Heat'),('Won NBA MVP'),('Drafted first overall')) as v(label)
 where s.slug = 'nba' on conflict (sport_id,label) do nothing;

insert into public.grids(sport_id,row_criteria,column_criteria,difficulty,scheduled_for,published_at)
select s.id,
 array[(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='nba' and c.label='Played for the Lakers'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='nba' and c.label='NBA Champion'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='nba' and c.label='NBA All-Star')],
 array[(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='nba' and c.label='Played for the Heat'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='nba' and c.label='Won NBA MVP'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='nba' and c.label='Drafted first overall')],
 3, date '2026-09-01', now()
from public.sports s where s.slug = 'nba'
on conflict (sport_id,scheduled_for) do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 0::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('LeBron James','Shaquille O''Neal','Gary Payton','Rajon Rondo')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 1::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Kobe Bryant','Shaquille O''Neal','LeBron James','Kareem Abdul-Jabbar','Magic Johnson','Russell Westbrook')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 2::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('LeBron James','Shaquille O''Neal','Dwight Howard','Anthony Davis','Magic Johnson')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 3::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('LeBron James','Dwyane Wade','Chris Bosh','Shaquille O''Neal','Ray Allen','Gary Payton','Udonis Haslem')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 4::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('LeBron James','Shaquille O''Neal','Kobe Bryant','Stephen Curry','Giannis Antetokounmpo','Kareem Abdul-Jabbar','Magic Johnson')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 5::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('LeBron James','Shaquille O''Neal','Anthony Davis','Magic Johnson','Tim Duncan')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 6::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Dwyane Wade','LeBron James','Chris Bosh','Shaquille O''Neal','Jimmy Butler','Alonzo Mourning','Ray Allen')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 7::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Kobe Bryant','LeBron James','Shaquille O''Neal','Stephen Curry','Giannis Antetokounmpo','Russell Westbrook','Kareem Abdul-Jabbar','Magic Johnson')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 8::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'nba' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('LeBron James','Shaquille O''Neal','Anthony Davis','Dwight Howard','Magic Johnson','Tim Duncan')
on conflict do nothing;

insert into public.athletes(sport_id,name,aliases)
select s.id, v.name, v.aliases from public.sports s,
 (values ('Adam Gilchrist',array['Gilchrist','Gilly']::text[]),('Babar Azam',array['Babar']::text[]),('Eoin Morgan','{}'::text[]),('Fakhar Zaman','{}'::text[]),('Imam-ul-Haq',array['Imam ul Haq','Imam']::text[]),('Imran Khan',array['Imran']::text[]),('Inzamam-ul-Haq',array['Inzamam ul Haq','Inzamam']::text[]),('Kumar Sangakkara',array['Sangakkara','Sanga']::text[]),('MS Dhoni',array['Mahendra Singh Dhoni','Dhoni']::text[]),('Michael Clarke','{}'::text[]),('Michael Hussey',array['Hussey','Mr Cricket']::text[]),('Misbah-ul-Haq',array['Misbah ul Haq','Misbah']::text[]),('Mohammad Amir','{}'::text[]),('Ricky Ponting',array['Ponting']::text[]),('Saeed Anwar','{}'::text[]),('Wasim Akram',array['Akram']::text[]),('Younis Khan','{}'::text[]),('Yuvraj Singh',array['Yuvraj']::text[])) as v(name,aliases)
 where s.slug = 'cricket' on conflict (sport_id,name) do nothing;

insert into public.criteria(sport_id,label,criteria_type)
select s.id, v.label, 'career' from public.sports s,
 (values ('Played for Pakistan'),('Won a Cricket World Cup'),('5000+ ODI runs'),('Played county cricket'),('Captained in a Test'),('Left-handed batter')) as v(label)
 where s.slug = 'cricket' on conflict (sport_id,label) do nothing;

insert into public.grids(sport_id,row_criteria,column_criteria,difficulty,scheduled_for,published_at)
select s.id,
 array[(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='cricket' and c.label='Played for Pakistan'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='cricket' and c.label='Won a Cricket World Cup'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='cricket' and c.label='5000+ ODI runs')],
 array[(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='cricket' and c.label='Played county cricket'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='cricket' and c.label='Captained in a Test'),(select c.id from public.criteria c join public.sports s on s.id=c.sport_id where s.slug='cricket' and c.label='Left-handed batter')],
 3, date '2026-09-01', now()
from public.sports s where s.slug = 'cricket'
on conflict (sport_id,scheduled_for) do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 0::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Imran Khan','Wasim Akram','Younis Khan','Mohammad Amir')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 1::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Imran Khan','Wasim Akram','Younis Khan','Misbah-ul-Haq','Babar Azam','Inzamam-ul-Haq')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 2::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Saeed Anwar','Fakhar Zaman','Imam-ul-Haq')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 3::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Imran Khan','Wasim Akram','Kumar Sangakkara','Ricky Ponting')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 4::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Imran Khan','Ricky Ponting','Kumar Sangakkara','MS Dhoni','Michael Clarke')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 5::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Kumar Sangakkara','Adam Gilchrist','Michael Hussey','Yuvraj Singh','Eoin Morgan')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 6::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Kumar Sangakkara','Ricky Ponting','Younis Khan')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 7::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Ricky Ponting','Kumar Sangakkara','MS Dhoni','Younis Khan','Michael Clarke','Babar Azam')
on conflict do nothing;

insert into public.grid_answers(grid_id,cell_index,athlete_id)
select gr.id, 8::smallint, a.id
from public.grids gr
join public.sports s on s.id = gr.sport_id and s.slug = 'cricket' and gr.scheduled_for = date '2026-09-01'
join public.athletes a on a.sport_id = s.id and a.name in ('Kumar Sangakkara','Adam Gilchrist','Yuvraj Singh','Saeed Anwar','Michael Hussey')
on conflict do nothing;