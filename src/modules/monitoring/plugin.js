const cron = require('node-cron');
const { pool } = require('../../lib/connectors/db');
const { get } = require('lodash');
const applicationStateService = require('../../lib/services/application-state-service');
const config = require('../../../config');
const { pgBossJobOverview } = require('./queries');

exports.plugin = {
  name: 'importMonitoring',
  dependencies: ['pgBoss'],
  register: () => {
    /**
     * The purpose of this plugin is to check the state of import jobs, and to store that in
     * the application state table.
     *
     * The checks are intentionally broken into separate queries. This is because the import
     * microservice is currently powered by PGBoss while other parts of The Service are powered
     * by BullMQ. The assumption/anticipation is that at some point, import jobs will coexist across
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
          const { rows: status } = await pool.query(pgBossJobOverview, [eachJob.id]);

          const failedCount = parseInt(get(status.find(row => row.state === 'failed'), 'count', 0));
          const completedCount = parseInt(get(status.find(row => row.state === 'completed'), 'count', 0));
          const isActive = !!status.find(row => row.state === 'active') || !!status.find(row => row.state === 'created');
          const lastUpdated = get(status.find(row => row.state === 'completed'), 'max_completed_date', null);

          applicationStateService.save(eachJob.id, {
            display_name: eachJob.displayName,
            failed_count: failedCount,
            completed_count: completedCount,
            active: isActive,
            last_updated: lastUpdated
          });
        });
      }
    );
  }
};
