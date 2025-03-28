'use strict'

require('dotenv').config()

const environment = process.env.ENVIRONMENT
const isProduction = environment === 'prd'

module.exports = {

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

  server: {
    port: 8007,
    router: {
      stripTrailingSlash: true
    }
  },

  services: {
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
    schedule: process.env.WRLS_CRON_NALD,
    nald: {
      zipPassword: process.env.NALD_ZIP_PASSWORD,
      path: process.env.S3_NALD_IMPORT_PATH || 'wal_nald_data_release'
    },
    licences: {
      // Note: If the `isCleanLicenceImportsEnabled` flag is set to `true` the licence data that no longer exists in
      // NALD but is in the WRLS DB will be removed from the WRLS DB
      isCleanLicenceImportsEnabled: (process.env.CLEAN_LICENCE_IMPORTS === 'true') || false
    }
  },

  notify: {
    apiKey: process.env.NOTIFY_API_KEY,
    mailbox: process.env.WATER_SERVICE_MAILBOX,
    templateId: '46eeaa9c-7346-4898-a4ad-4e26d239d4ef'
  },

  // Credit to https://stackoverflow.com/a/323546/6117745 for how to handle
  // converting the env var to a boolean
  featureFlags: {
    disableReturnsImports: String(process.env.DISABLE_RETURNS_IMPORTS) === 'true' || false
  }
}
