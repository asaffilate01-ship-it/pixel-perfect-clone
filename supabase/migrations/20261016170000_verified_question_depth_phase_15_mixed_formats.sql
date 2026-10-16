-- Verified question depth phase 15: 32 independent sports facts, 8 each
-- for AFL, snooker, darts and Formula 1 across all four difficulty bands.
-- 20 authoritative multiple-choice/true-false questions and 12 typed questions.
-- Source-backed. Run only on the existing Fanzeno Supabase project, after phase 14.
with editorial as (
  select id from public.data_sources where name='Fanzeno sourced editorial' limit 1
), seed(sport_slug,category_key,prompt,clue,accepted_json,display,percentile,source_url,source_title,question_type,options_json) as (values
('afl','premiership','Which club won the 2024 AFL men''s premiership?','They defeated Sydney in the Grand Final.','["Brisbane Lions","Brisbane"]','Brisbane Lions','0.12','https://www.afl.com.au/stats/premiership-winners','AFL Premiership Winners','single_choice','["Brisbane Lions","Sydney Swans","Collingwood","Geelong Cats"]'),
('afl','premiership','Which club claimed the 2023 AFL premiership, edging Brisbane in the Grand Final?','The team is based in Melbourne.','["Collingwood","Collingwood Magpies","Magpies"]','Collingwood','0.18','https://www.afl.com.au/stats/premiership-winners','AFL Premiership Winners','typed_single','[]'),
('afl','premiership','Who won the 2022 AFL Grand Final against Sydney?','This Victorian club won its tenth VFL/AFL title.','["Geelong Cats","Geelong"]','Geelong Cats','0.37','https://www.afl.com.au/stats/premiership-winners','AFL Premiership Winners','single_choice','["Sydney Swans","Richmond","Geelong Cats","Hawthorn"]'),
('afl','premiership','True or false: Melbourne defeated Western Bulldogs to win the 2021 AFL Grand Final.','The Demons ended a long title drought.','["True"]','True','0.42','https://www.afl.com.au/stats/premiership-winners','AFL Premiership Winners','single_choice','["True","False"]'),
('afl','premiership','Which club ended a 62-year premiership drought in 2016?','They defeated Sydney at the MCG.','["Western Bulldogs","Bulldogs"]','Western Bulldogs','0.62','https://www.afl.com.au/matches/1157','AFL 2016 Grand Final result','typed_single','[]'),
('afl','premiership','Which club defeated Hawthorn in the 2012 AFL Grand Final?','The winners play their home matches in New South Wales.','["Sydney Swans","Sydney"]','Sydney Swans','0.69','https://www.afl.com.au/stats/premiership-winners','AFL Premiership Winners','single_choice','["Hawthorn","Sydney Swans","Geelong Cats","West Coast Eagles"]'),
('afl','premiership','Which club lost the 2007 AFL Grand Final to Geelong?','The club represents the city of Adelaide''s port district.','["Port Adelaide","Port Adelaide Power","Power"]','Port Adelaide','0.87','https://www.afl.com.au/stats/premiership-winners','AFL Premiership Winners','typed_single','[]'),
('afl','premiership','Which club won the 2010 AFL premiership?','Their Grand Final against St Kilda required a replay.','["Collingwood","Collingwood Magpies"]','Collingwood','0.93','https://www.afl.com.au/stats/premiership-winners','AFL Premiership Winners','single_choice','["St Kilda","Collingwood","Geelong Cats","Hawthorn"]'),
('snooker','world-championship','Who won the 2024 World Snooker Championship after defeating Jak Jones?','He is nicknamed the Warrior.','["Kyren Wilson","Wilson"]','Kyren Wilson','0.12','https://www.wst.tv/news/2024/may/06/wilson-c/','World Snooker Tour Championship history','single_choice','["Kyren Wilson","Judd Trump","Mark Selby","Luca Brecel"]'),
('snooker','world-championship','Which Belgian won his first World Snooker Championship in 2023?','He defeated Mark Selby in the final.','["Luca Brecel","Brecel"]','Luca Brecel','0.18','https://www.wst.tv/news/2023/may/02/story-of-the-2023-cazoo-world-championship/','World Snooker Tour Championship history','typed_single','[]'),
('snooker','world-championship','Who lost to Ronnie O''Sullivan in the 2022 World Snooker Championship final?','The runner-up is nicknamed The Ace in the Pack.','["Judd Trump","Trump"]','Judd Trump','0.37','https://www.wst.tv/news/2022/may/02/osullivan-beats-trump-for-magnificent-seventh/','World Snooker Tour Championship history','single_choice','["Judd Trump","John Higgins","Mark Williams","Neil Robertson"]'),
('snooker','world-championship','True or false: Shaun Murphy won the 2021 World Snooker Championship.','Mark Selby prevailed in the final.','["False"]','False','0.42','https://www.wst.tv/news/2021/august/16/matchroom-live-british-open-preview/','World Snooker Tour Championship history','single_choice','["False","True"]'),
('snooker','world-championship','Who defeated John Higgins 18-9 in the 2019 World Snooker Championship final?','The champion is from Bristol.','["Judd Trump","Trump"]','Judd Trump','0.62','https://www.wst.tv/news/2024/april/20/crucible-2024-seeds--judd-trump/','World Snooker Tour Championship history','typed_single','[]'),
('snooker','world-championship','Who won the 2018 World Snooker Championship after beating John Higgins 18-16?','This Welsh champion also won in 2000 and 2003.','["Mark Williams","Williams"]','Mark Williams','0.69','https://www.wst.tv/news/2025/april/30/Williams-Beats-Higgins-In-Crucible-Epic/','World Snooker Tour Championship history','single_choice','["Mark Williams","Mark Selby","Shaun Murphy","John Higgins"]'),
('snooker','world-championship','Who finished runner-up to Shaun Murphy at the 2005 World Snooker Championship?','He was the beaten finalist in an 18-16 contest.','["Matthew Stevens","Stevens"]','Matthew Stevens','0.87','https://www.wst.tv/news/2024/april/18/crucible-2024-seeds--shaun-murphy/','World Snooker Tour Championship history','typed_single','[]'),
('snooker','world-championship','Who made the first 147 break in a World Snooker Championship final, in 2023?','This player also contested the final against Luca Brecel.','["Mark Selby","Selby"]','Mark Selby','0.93','https://www.wst.tv/news/2023/may/02/story-of-the-2023-cazoo-world-championship/','World Snooker Tour Championship history','single_choice','["Mark Selby","Luca Brecel","Ronnie O''Sullivan","John Higgins"]'),
('darts','world-championship','Who won the 2025 PDC World Darts Championship at age 17?','He defeated Michael van Gerwen in the final.','["Luke Littler","Littler"]','Luke Littler','0.12','https://www.reuters.com/sports/luke-the-nuke-littler-downs-van-gerwen-7-3-become-youngest-champ-2025-01-03/','Reuters 2025 PDC World Championship final','single_choice','["Luke Littler","Luke Humphries","Michael van Gerwen","Peter Wright"]'),
('darts','world-championship','Which player became a two-time PDC World Champion in 2022?','He defeated Michael Smith 7-5.','["Peter Wright","Wright"]','Peter Wright','0.18','https://www.pdc-europe.tv/news/wright-defeats-smith-to-become-two-time-world-champion/','PDC World Darts Championship official event reporting','typed_single','[]'),
('darts','world-championship','Who was runner-up to Gerwyn Price in the 2021 PDC World Championship?','The finalist had already won the title in 2015 and 2016.','["Gary Anderson","Anderson"]','Gary Anderson','0.37','https://www.pdc-europe.tv/news/prolific-price-is-crowned-william-hill-world-darts-champion/','PDC World Darts Championship official event reporting','single_choice','["Gary Anderson","Michael Smith","Peter Wright","Michael van Gerwen"]'),
('darts','world-championship','Who defeated Michael Smith to win the 2019 PDC World Championship?','This Dutch champion collected his third PDC world title.','["Michael van Gerwen","MVG","van Gerwen"]','Michael van Gerwen','0.42','https://www.youtube.com/watch?v=8wSEIalzvXk','Professional Darts Corporation official 2019 final','typed_single','[]'),
('darts','world-championship','Who defeated Phil Taylor in the 2015 PDC World Championship final?','The Scottish player won his first world title in a deciding set.','["Gary Anderson","Anderson"]','Gary Anderson','0.62','https://www.youtube.com/watch?v=Ux4JvXlXAMA','Professional Darts Corporation official 2015 final','single_choice','["Gary Anderson","Michael Smith","Peter Wright","Adrian Lewis"]'),
('darts','world-championship','True or false: the 2021 PDC World Championship was the first won by a Welsh player.','Gerwyn Price lifted the Sid Waddell Trophy.','["True"]','True','0.69','https://www.pdc-europe.tv/news/prolific-price-is-crowned-william-hill-world-darts-champion/','PDC World Darts Championship official event reporting','single_choice','["False","True"]'),
('darts','world-championship','Who lost the 2022 PDC World Championship final 7-5 to Peter Wright?','He later became world champion himself.','["Michael Smith","Smith"]','Michael Smith','0.87','https://www.pdc-europe.tv/news/wright-defeats-smith-to-become-two-time-world-champion/','PDC World Darts Championship official event reporting','typed_single','[]'),
('darts','world-championship','What was the final set score when Gary Anderson beat Phil Taylor at the 2015 PDC World Championship?','The match required a deciding thirteenth set.','["7-6","7–6","7 to 6"]','7-6','0.93','https://www.bbc.co.uk/sport/live/darts/30636785','BBC Sport 2015 PDC World Championship final','single_choice','["7-3","7-5","7-6","7-4"]'),
('f1','drivers-championship','Who won the 1996 Formula 1 Drivers'' World Championship?','He drove for Williams and later became a commentator.','["Damon Hill","Hill"]','Damon Hill','0.12','https://www.formula1.com/en/results/1996/drivers','Formula 1 official historical driver standings','single_choice','["Damon Hill","Jacques Villeneuve","Michael Schumacher","Mika Hakkinen"]'),
('f1','drivers-championship','Which driver won the 2008 Formula 1 Drivers'' Championship by one point?','He won the title with McLaren.','["Lewis Hamilton","Hamilton"]','Lewis Hamilton','0.18','https://www.formula1.com/en/results/2008/drivers','Formula 1 official historical driver standings','typed_single','[]'),
('f1','drivers-championship','Who won the 1984 Formula 1 Drivers'' Championship for McLaren?','He finished half a point ahead of Alain Prost.','["Niki Lauda","Lauda"]','Niki Lauda','0.37','https://www.formula1.com/en/results/1984/drivers','Formula 1 official historical driver standings','single_choice','["Niki Lauda","Alain Prost","Nelson Piquet","Keke Rosberg"]'),
('f1','drivers-championship','True or false: Niki Lauda won the 1976 Formula 1 Drivers'' Championship.','A McLaren driver finished one point ahead of him.','["False"]','False','0.42','https://www.formula1.com/en/results/1976/drivers','Formula 1 official historical driver standings','single_choice','["True","False"]'),
('f1','drivers-championship','Which driver won the 1992 Formula 1 Drivers'' Championship in a Williams?','He took nine Grand Prix wins that season.','["Nigel Mansell","Mansell"]','Nigel Mansell','0.62','https://www.formula1.com/en/results/1992/drivers','Formula 1 official historical driver standings','typed_single','[]'),
('f1','drivers-championship','Which American driver won the 1978 Formula 1 Drivers'' Championship?','He won the title with Lotus.','["Mario Andretti","Andretti"]','Mario Andretti','0.69','https://www.formula1.com/en/results/1978/drivers','Formula 1 official historical driver standings','single_choice','["Mario Andretti","Phil Hill","Dan Gurney","Peter Revson"]'),
('f1','drivers-championship','Who became the 1961 Formula 1 Drivers'' World Champion for Ferrari?','He finished one point ahead of Wolfgang von Trips.','["Phil Hill","Philip Hill"]','Phil Hill','0.87','https://www.formula1.com/en/results/1961/drivers','Formula 1 official historical driver standings','typed_single','[]'),
('f1','drivers-championship','Which Canadian won the 1997 Formula 1 Drivers'' World Championship?','He drove for Williams.','["Jacques Villeneuve","Villeneuve"]','Jacques Villeneuve','0.93','https://www.formula1.com/en/results/1997/drivers','Formula 1 official historical driver standings','single_choice','["Jacques Villeneuve","Gilles Villeneuve","Damon Hill","David Coulthard"]')
), validated as (
  select *, accepted_json::jsonb as accepted, options_json::jsonb as options
  from seed
  where length(trim(prompt))>12 and length(trim(clue))>4 and length(trim(display))>0
    and percentile::numeric >= 0 and percentile::numeric <= 1
    and source_url like 'https://%'
    and jsonb_typeof(accepted_json::jsonb)='array'
    and jsonb_array_length(accepted_json::jsonb)>0
    and accepted_json::jsonb @> jsonb_build_array(display)
    and (
      (question_type='typed_single' and options_json::jsonb='[]'::jsonb)
      or (question_type='single_choice'
          and jsonb_typeof(options_json::jsonb)='array'
          and jsonb_array_length(options_json::jsonb) between 2 and 6
          and options_json::jsonb @> jsonb_build_array(display))
    )
)
insert into public.question_bank(
  sport_id,category_key,question_type,format_key,prompt_i18n,clue_i18n,answer_rule,
  answer_display_i18n,difficulty_b,difficulty_percentile,editorial_difficulty_percentile,
  difficulty_confidence,quality_score,ambiguity_score,verification_status,source_id,
  source_url,source_title,content_hash,reviewed_at,active
)
select s.id, v.category_key,v.question_type,'classic_trivia',
       jsonb_build_object('en',v.prompt),jsonb_build_object('en',v.clue),
       jsonb_build_object('accepted',v.accepted) ||
         case when v.question_type='single_choice'
           then jsonb_build_object('options',v.options) else '{}'::jsonb end,
       jsonb_build_object('en',v.display),
       case when v.percentile::numeric<.25 then -1.3 when v.percentile::numeric<.5 then -.3
         when v.percentile::numeric<.75 then .7 else 1.5 end,
       v.percentile::numeric,v.percentile::numeric,0,1,0,'verified',editorial.id,
       v.source_url,v.source_title,
       encode(extensions.digest(v.prompt,'sha256'),'hex'),now(),true
from validated v
join public.sports s on s.slug=v.sport_slug
cross join editorial
on conflict do nothing;

-- Verify the applied rows against the question bank before publishing:
-- select s.slug, public.question_difficulty_band(q.difficulty_percentile), q.question_type,
-- count(*) from public.question_bank q join public.sports s on s.id=q.sport_id
-- where q.content_hash in (select encode(extensions.digest(prompt,'sha256'),'hex') from seed)
-- group by 1,2,3;
