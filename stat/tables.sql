
create table graph_runs
(
    id           INTEGER
        primary key autoincrement,
    duration     REAL    not null,
    model        TEXT    not null,
    graph_index  INTEGER not null,
    num_vertices INTEGER not null,
    is_valid     INTEGER not null,
    error_msg    TEXT,
    added        TEXT    not null,
    matrix_dump  TEXT,
    prompt       TEXT,
    http_code    integer,
    http_error   text,
    provider     text,
    reply        text,
    version      text
);

-----

CREATE VIEW top_models as
select round(sum(accuracy),1) as acc,model,max(graph_index) as tested
     ,round(sum(duration)) as duration,log(round(sum(duration))) as log_duration
from unique_avg
group by model
order by sum(accuracy) desc;

---

CREATE VIEW unique_avg as
select
    max(added) as added, graph_index, model, is_valid,
--    max(is_valid) as has_ok, 1-min(is_valid) as has_errors,
    max(is_valid) as accuracy,
    -- sum(1.0*is_valid)/count(*) as accuracy, -- works
    avg(duration) as duration,
    count(*)                 as tries
from graph_runs
group by graph_index, model
order by graph_index, model;

