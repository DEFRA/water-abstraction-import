'use strict';

const { pool } = require('../db');

const getJobSummaryQuery = `
  select
    data->>'displayName' as name,
    data->>'failedCount' as failedCount,
    data->>'completedCount' as completedCount,
    data->>'active' as active,
    data->>'lastUpdated' as lastUpdated,
    date_updated as dateUpdated
  from
    water.application_state
  where
    key like '%import%'
    and data->>'display_name' is not null;
`;

const getJobSummary = async () => {
  const result = await pool.query(getJobSummaryQuery);
  return result.rows;
};

exports.getJobSummary = getJobSummary;
