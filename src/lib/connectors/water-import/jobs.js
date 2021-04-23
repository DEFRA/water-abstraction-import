'use strict';

const { pool } = require('../db');
const { get } = require('lodash');
const { pgBossJobOverview, pgBossFailedJobs } = require('./queries');

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
    { id: 'nald-import.import-licence', displayName: 'Licences (NALD)' },
    { id: 'import.licences', displayName: 'Licences' },
    { id: 'import.licence', displayName: 'Licence' },
    { id: 'import.delete-documents', displayName: 'Delete removed documents' },
    { id: 'nald-import.delete-removed-documents', displayName: 'Delete removed documents (NALD)' },
    { id: 'nald-import.s3-download', displayName: 'NALD Zip Download' },
    { id: 'nald-import.populate-pending-import', displayName: 'Populate pending import' },
    { id: 'import.bill-runs', displayName: 'Bill runs' },
    { id: 'import.charging-data', displayName: 'Charging data' },
    { id: 'import.companies', displayName: 'Companies' },
    { id: 'import.company', displayName: 'Company' }
  ];

  return Promise.all(pgBossJobsArray.map(async eachJob => {
    const { rows: status } = await pool.query(pgBossJobOverview, [eachJob.id]);

    const failedCount = parseInt(get(status.find(row => row.state === 'failed'), 'count', 0));
    const completedCount = parseInt(get(status.find(row => row.state === 'completed'), 'count', 0));
    const isActive = !!status.find(row => row.state === 'active') || !!status.find(row => row.state === 'created');
    const lastUpdated = get(status.find(row => row.state === 'completed'), 'max_completed_date', null);

    return {
      displayName: eachJob.displayName,
      failedCount,
      completedCount,
      isActive,
      lastUpdated
    };
  }));
};

const getFailedJobs = async () => {
  const { rows } = await pool.query(pgBossFailedJobs);
  return rows.map(row => {
    return {
      jobName: row.name,
      total: row.count,
      dateFailed: row.max_completed_date
    };
  });
};

exports.getFailedJobs = getFailedJobs;
exports.getJobSummary = getJobSummary;
