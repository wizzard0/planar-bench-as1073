PRAGMA journal_mode = WAL;

-- accuracy
select *
from (
         select
             max(added) as added, graph_index, model, is_valid,
--    max(is_valid) as has_ok, 1-min(is_valid) as has_errors,
             sum(1.0*is_valid)/count(*) as accuracy, -- works
             duration,
             count(*)                 as tries
         from graph_runs
         group by graph_index, model
         order by graph_index, model
     )
where tries>1;
-- top models
select * from (
select round(sum(accuracy),1) as acc,model,max(graph_index) as tested
     ,round(sum(duration)) as duration,log(round(sum(duration))) as log_duration
from unique_avg
group by model
order by sum(accuracy) desc
    )
where acc>45 or model like 'gpt-5%'
;
-- per_task
select round(sum(accuracy),1) as acc,graph_index
     ,round(sum(duration)) as duration
from unique_avg
where 1=1 or model in('deepseek-r1',
               'aion-1.0',
               'o3-mini',
               'o1-mini',
               'gpt-5-nano-2025-08-07',
               'sonnet-3-5-1022',
               'sonnet-3-7-0219',
               'sonnet-3-7-0219-32k',
               'gemini-2.0-pro-exp-02-05',
               'gpt-4o',
               'qwen-2.5-coder-32b',
               'phi-4',
               'qwen-2.5-72b-instruct',
               'grok-2',
               'gemini-2.0-flash')
group by graph_index
order by graph_index asc;
-- last/avg
select sum(accuracy) as acc,model,max(graph_index)
from unique_avg
where accuracy>0.5
group by model
order by sum(accuracy) desc;


-- gaps for sonnet
SELECT t1.id as oid, t1.graph_index, t1.model AS a1, t1.is_valid AS b1,
       t2.id as aid, t2.model AS a2, t2.is_valid AS b2
FROM graph_runs t1
         JOIN graph_runs t2 ON t1.graph_index = t2.graph_index
WHERE t1.model = 'o1' AND t1.is_valid = 1
  AND t2.model = 'sonnet-3-7-0219-32k' AND t2.is_valid = 0;

-- gaps for sonnet2
SELECT t1.graph_index, t1.model AS a1, t1.is_valid AS b1,
       t2.model AS a2, t2.is_valid AS b2
FROM unique_avg t1
         JOIN unique_avg t2 ON t1.graph_index = t2.graph_index
WHERE t1.model = 'o1' AND t1.is_valid = 1
  AND t2.model = 'sonnet-3-7-0219-32k' AND t2.is_valid = 0;

-- delete from graph_runs where model='gemini-2.0-pro-exp-02-05'
-- delete from graph_runs where model='llama-3.3-70b';

-- delete from graph_runs where model='deepseek-r1';
-- delete from graph_runs where model like 'deepseek-v3%';

-- delete from graph_runs where model='o1-preview';

-- 'deepseek-r1',
-- 'aion-1.0',
-- 'o3-mini',
-- 'o1-mini',
-- 'sonnet-3-5-1022',
-- 'gemini-2.0-pro-exp-02-05',
-- 'gpt-4o',
-- 'qwen-2.5-coder-32b',
-- 'phi-4',
-- 'qwen-2.5-72b-instruct',
-- 'grok-2',
-- 'gemini-2.0-flash',
