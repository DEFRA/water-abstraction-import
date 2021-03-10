'use strict';

const { pool } = require('../db');
const { get } = require('lodash');
const { pgBossJobOverview } = require('./queries');

const getJobSummary = () => {
  /**
   * The purpose of this route is to check the state of import jobs.
   *
   * The checks are intentionally broken into separate queries. This is because the import
   * microservice is currently powered by PGBoss while other parts of The Service are powered
   * by BullMQ. The assumption/anticipation is that at some point, import jobs will coexist across
   * multiple job handlers... Maybe.
   */
  const pgBossJobsArray = [
    { id: 'nald-import.import-licence', displayName: 'Licences' },
    { id: 'import.bill-runs', displayName: 'Bill runs' },
    { id: 'import.charging-data', displayName: 'Charging data' },
    { id: 'import.company', displayName: 'Companies' }
  ];

  return Promise.all(pgBossJobsArray.map(async eachJob => {
    const { rows: status } = await pool.query(pgBossJobOverview, [eachJob.id]);

    const failedCount = parseInt(get(status.find(row => row.state === 'failed'), 'count', 0));
    const completedCount = parseInt(get(status.find(row => row.state === 'completed'), 'count', 0));
    const active = !!status.find(row => row.state === 'active') || !!status.find(row => row.state === 'created');
    const lastUpdated = get(status.find(row => row.state === 'completed'), 'max_completed_date', null);

    return {
      displayName: eachJob.displayName,
      failedCount,
      completedCount,
      active,
      lastUpdated
    };
  }));
};

exports.getJobSummary = getJobSummary;
