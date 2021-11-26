'use strict';

require('dotenv').config();

const ENV_LOCAL = 'local';
const ENV_DEV = 'dev';
const ENV_QA = 'qa';
const ENV_TEST = 'test';
const ENV_PREPROD = 'preprod';
const ENV_PRODUCTION = 'production';

const isAcceptanceTestTarget = [ENV_LOCAL, ENV_DEV, ENV_TEST, ENV_QA, ENV_PREPROD].includes(process.env.NODE_ENV);
const testMode = parseInt(process.env.TEST_MODE) === 1;
const isProduction = process.env.NODE_ENV === ENV_PRODUCTION;
const isLocal = process.env.NODE_ENV === ENV_LOCAL;
const isTest = process.env.NODE_ENV === ENV_TEST;

module.exports = {

  blipp: {
    showAuth: true
  },

  jwt: {
    key: process.env.JWT_SECRET,
    verifyOptions: { algorithms: ['HS256'] }
  },

  logger: {
    level: testMode ? 'info' : 'error',
    airbrakeKey: process.env.ERRBIT_KEY,
    airbrakeHost: process.env.ERRBIT_SERVER,
    airbrakeLevel: 'error'
  },

  pg: {
    connectionString: process.env.DATABASE_URL,
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
    returns: process.env.RETURNS_URI || 'http://127.0.0.1:8006/returns/1.0'
  },

  s3: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    region: 'eu-west-1',
    bucket: process.env.S3_BUCKET
  },

  isProduction,

  isAcceptanceTestTarget,

  proxy: process.env.PROXY,

  import: {
    nald: {
      isEtagCheckEnabled: !isTest,
      zipPassword: process.env.NALD_ZIP_PASSWORD,
      path: process.env.S3_NALD_IMPORT_PATH || 'wal_nald_data_release'
    },
    licences: {
      schedule: isProduction ? '0 4 * * 1,2,3,4,5' : '0 16 * * 1,2,3,4,5',
      // Note: these 2 flags need to be set to false for charging go-live
      // to suspend the import of invoice accounts and licence agreements
      // Update: I've changed those values to false ahead of the v2.0 charging
      // release as described in WATER-3201 - TT 20210603
      isInvoiceAccountImportEnabled: true,
      isLicenceAgreementImportEnabled: false,
      // Note: we think a solution is needed where a list of billing contacts
      // for a given licence is calculated from the charge version history
      // in the water service, and synced to CRM v2.
      // This will supersede the implementation here where the billing contact history
      // was calculated from NALD data
      isBillingDocumentRoleImportEnabled: false
    },
    charging: {
      schedule: isProduction ? '0 1 * * 1,2,3,4,5' : '0 14 * * 1,2,3,4,5'
    },
    monitoring: {
      schedule: '* * * * *'
    }
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    ...!isLocal && {
      password: process.env.REDIS_PASSWORD,
      tls: {}
    },
    db: 0
  },
  notify: {
    templates: {
      service_status_alert: 'c34d1b16-694b-4364-8e7e-83e9dbd34a62'
    }
  }
};
