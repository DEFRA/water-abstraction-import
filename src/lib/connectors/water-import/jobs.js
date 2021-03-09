'use strict';

const { pool } = require('../db');

const getJobSummaryQuery = `
  select
    data->>'display_name' as name,
    data->>'failed_count' as failed_count,
    data->>'completed_count' as completed_count,
    data->>'active' as active,
    data->>'last_updated' as last_updated,
    date_updated
  from
    water.water.application_state
  where
    key like '%import%'
    and data->>'display_name' is not null;
`;

const getJobSummary = async () => {
  const result = await pool.query(getJobSummaryQuery);
  return result.rows;
};

exports.getJobSummary = getJobSummary;
