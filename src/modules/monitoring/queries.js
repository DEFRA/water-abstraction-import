const pgBossJobOverview = `select state, sum(count) as count, max(max_completed_date) as max_completed_date from (select
    state,
    COUNT(*),
    max(completedon) as max_completed_date
from
    water.water_import.job j
where
    j.state in ('failed', 'completed', 'active')
    and (j.createdon > now() - interval '3 days' or j.completedon > now() - interval '3 days')
    and j.name = $1
    group by j.state
union all 
select
    state,
    COUNT(*),
    max(completedon) as max_completed_date
from
    water_import.archive a
where
    a.state in ('failed', 'completed', 'active')
    and (a.createdon > now() - interval '3 days' or a.completedon > now() - interval '3 days')
    and a.name = $1
    group by a.state) cte 
    group by state`;

exports.pgBossJobOverview = pgBossJobOverview;
