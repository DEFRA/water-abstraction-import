const cron = require('node-cron');
const { pool } = require('../../lib/connectors/db');
const { get } = require('lodash');
const moment = require('moment');
const applicationStateService = require('../../lib/services/application-state-service');
const config = require('../../../config');
const { pgBossJobOverview } = require('./queries');

exports.plugin = {
  name: 'importMonitoring',
  dependencies: ['pgBoss'],
  register: server => {
    /**
     * The purpose of this plugin is to check the state of import jobs, and to store that in
     * the application state table.
     *
     * The checks are intentionally broken into numerous queries. This is because the import
     * microservice is currently powered by PGBoss while other parts of The Service are powered
     * by BullMQ.
     *
     * The queries are 'split' in anticipation that at some point, import jobs will coexist across
     * multiple job handlers... Maybe.
     */
    cron.schedule(config.import.monitoring.schedule,
      async () => {
        const pgBossJobsArray = [
          { id: 'nald-import.import-licence', displayName: 'Licences' },
          { id: 'import.bill-runs', displayName: 'Bill runs' },
          { id: 'import.charging-data', displayName: 'Charging data' },
          { id: 'import.company', displayName: 'Companies' }
        ];

        pgBossJobsArray.map(async eachJob => {
          const importStatus = await pool.query(pgBossJobOverview, [eachJob.id]);

          applicationStateService.save(eachJob.id, {
            display_name: eachJob.displayName,
            failed_count: parseInt(get(importStatus.rows.find(row => row.state === 'failed'), 'count', 0)),
            completed_count: parseInt(get(importStatus.rows.find(row => row.state === 'completed'), 'count', 0)),
            active: !!importStatus.rows.find(row => row.state === 'active'),
            last_updated: get(importStatus.rows.find(row => row.state === 'completed'), 'max_completed_date', null)

          });
        });
      }
    );
  }
};
