const pgBossJobOverview = `select state, sum(count) as count, max(max_completed_date) as max_completed_date from (select
    state,
    COUNT(*),
    max(completedon) as max_completed_date
from
    water_import.job j
where
    j.state in ('failed', 'completed', 'active', 'created')
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
    a.state in ('failed', 'completed', 'active', 'created')
    and (a.createdon > now() - interval '3 days' or a.completedon > now() - interval '3 days')
    and a.name = $1
    group by a.state) cte 
    group by state`;

const pgBossFailedJobs = `select name, sum(count) as count, max(max_completed_date) as max_completed_date, max(max_created_date) as max_created_date from (select
        name,
        COUNT(*),
        max(completedon) as max_completed_date,
        max(createdon) as max_created_date
    from
        water_import.job j
    where
        j.state = 'failed'
        and (j.createdon > now() - interval '12 hours' or j.completedon > now() - interval '12 hours')
        group by j.name
    union all 
    select
        name,
        COUNT(*),
        max(completedon) as max_completed_date,
        max(createdon) as max_created_date
    from
        water_import.archive a
    where
        a.state = 'failed'
        and (a.createdon > now() - interval '12 hours' or a.completedon > now() - interval '12 hours')        
        group by a.name) cte 
        group by name`;

exports.pgBossFailedJobs = pgBossFailedJobs;
exports.pgBossJobOverview = pgBossJobOverview;
