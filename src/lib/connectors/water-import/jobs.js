'use strict'

const { pool } = require('../db')
const { pgBossJobOverview, pgBossFailedJobs } = require('./queries')
const moment = require('moment')

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
  ]

  return Promise.all(pgBossJobsArray.map(async eachJob => {
    const { rows: status } = await pool.query(pgBossJobOverview, [eachJob.id])

    const failedRow = status.find(row => row.state === 'failed')
    const failedCount = parseInt(failedRow?.count ?? 0)
    const completedRow = status.find(row => row.state === 'completed')
    const completedCount = parseInt(completedRow?.count ?? 0)
    const isActive = !!status.find(row => row.state === 'active') || !!status.find(row => row.state === 'created')
    const lastUpdated = completedRow?.max_completed_date ?? null

    return {
      displayName: eachJob.displayName,
      failedCount,
      completedCount,
      isActive,
      lastUpdated
    }
  }))
}

const getFailedJobs = async () => {
  const { rows } = await pool.query(pgBossFailedJobs)
  return rows.map(row => {
    return {
      jobName: row.name,
      total: row.count,
      dateCreated: row.max_created_date ? moment(row.max_created_date).format('DD MMM YYYY HH:mm:ss') : '',
      dateCompleted: row.max_completed_date ? moment(row.max_completed_date).format('DD MMM YYYY HH:mm:ss') : ''
    }
  })
}

module.exports = {
  getFailedJobs,
  getJobSummary
}
