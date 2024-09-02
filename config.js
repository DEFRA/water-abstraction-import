'use strict'

require('dotenv').config()

const environment = process.env.ENVIRONMENT
const isProduction = environment === 'prd'

const isTlsConnection = (process.env.REDIS_HOST || '').includes('aws')

module.exports = {

  blipp: {
    showAuth: true
  },

  jwt: {
    key: process.env.JWT_SECRET,
    verifyOptions: { algorithms: ['HS256'] }
  },

  // This config is specifically for hapi-pino which was added to replace the deprecated (and noisy!) hapi/good. At
  // some point all logging would go through this. But for now, it just covers requests & responses
  log: {
    // Credit to https://stackoverflow.com/a/323546/6117745 for how to handle
    // converting the env var to a boolean
    logInTest: (String(process.env.LOG_IN_TEST) === 'true') || false,
    level: process.env.WRLS_LOG_LEVEL || 'warn'
  },

  // This config is used by water-abstraction-helpers and its use of Winston and Airbrake. Any use of `logger.info()`,
  // for example, is built on this config.
  logger: {
    level: process.env.WRLS_LOG_LEVEL || 'warn',
    airbrakeKey: process.env.ERRBIT_KEY,
    airbrakeHost: process.env.ERRBIT_SERVER,
    airbrakeLevel: 'error'
  },

  airbrake: {
    host: process.env.AIRBRAKE_HOST,
    projectKey: process.env.AIRBRAKE_KEY,
    projectId: 1,
    environment
  },

  pg: {
    connectionString: process.env.NODE_ENV !== 'test' ? process.env.DATABASE_URL : process.env.TEST_DATABASE_URL,
    max: 20
  },

  pgBoss: {
    schema: 'water_import',
    application_name: process.env.SERVICE_NAME,
    newJobCheckIntervalSeconds: 10
  },

  server: {
    port: 8007,
    router: {
      stripTrailingSlash: true
    }
  },

  services: {
    water: process.env.WATER_URI || 'http://127.0.0.1:8001/water/1.0',
    crm: process.env.CRM_URI || 'http://127.0.0.1:8002/crm/1.0',
    returns: process.env.RETURNS_URI || 'http://127.0.0.1:8006/returns/1.0',
    system: process.env.SYSTEM_URI || 'http://127.0.0.1:8013'
  },

  s3: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    region: 'eu-west-1',
    bucket: process.env.S3_BUCKET
  },

  isProduction,
  environment,

  proxy: process.env.PROXY,

  import: {
    nald: {
      zipPassword: process.env.NALD_ZIP_PASSWORD,
      path: process.env.S3_NALD_IMPORT_PATH || 'wal_nald_data_release',
      schedule: process.env.WRLS_CRON_NALD || '0 1 * * *'
    },
    licences: {
      schedule: process.env.WRLS_CRON_LICENCES || '0 4 * * 1,2,3,4,5',
      // Note: these 2 flags need to be set to false for charging go-live
      // to suspend the import of invoice accounts and licence agreements
      // Update: I've changed those values to false ahead of the v2.0 charging
      // release as described in WATER-3201 - TT 20210603
      isInvoiceAccountImportEnabled: true,
      // Credit to https://stackoverflow.com/a/323546/6117745 for how to handle
      // converting the env var to a boolean
      isLicenceAgreementImportEnabled: (process.env.IMPORT_LICENCE_AGREEMENTS === 'true') || false,
      // Note: we think a solution is needed where a list of billing contacts
      // for a given licence is calculated from the charge version history
      // in the water service, and synced to CRM v2.
      // This will supersede the implementation here where the billing contact history
      // was calculated from NALD data
      isBillingDocumentRoleImportEnabled: false
    },
    modLogs: {
      schedule: process.env.WRLS_CRON_MOD_LOGS || '0 7 * * 1,2,3,4,5'
    },
    returnVersions: {
      schedule: process.env.WRLS_CRON_RETURN_VERSIONS || '0 6 * * 1,2,3,4,5'
    },
    tracker: {
      schedule: process.env.WRLS_CRON_TRACKER || '0 10 * * 1,2,3,4,5'
    }
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    ...(isTlsConnection) && { tls: {} },
    db: 0
  },
  notify: {
    templates: {
      service_status_alert: 'c34d1b16-694b-4364-8e7e-83e9dbd34a62'
    }
  }
}
