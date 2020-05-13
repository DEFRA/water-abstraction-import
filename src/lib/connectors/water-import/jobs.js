'use strict';

const { pool } = require('../db');

const getJobSummaryQuery = `
  select name, state, count(*)
  from water_import.job
  group by name, state;
`;

const getJobSummary = async () => {
  const result = await pool.query(getJobSummaryQuery);
  return result.rows;
};

exports.getJobSummary = getJobSummary;
