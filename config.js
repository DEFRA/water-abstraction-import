'use strict';

require('dotenv').config();

const ENV_LOCAL = 'local';
const ENV_DEV = 'dev';
const ENV_TEST = 'test';
const ENV_PREPROD = 'preprod';
const ENV_PRODUCTION = 'production';

const isAcceptanceTestTarget = [ENV_LOCAL, ENV_DEV, ENV_TEST, ENV_PREPROD].includes(process.env.NODE_ENV);
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
    returns: { importYears: process.env.IMPORT_RETURNS_YEARS || 6 },
    nald: {
      isEtagCheckEnabled: !isTest,
      zipPassword: process.env.NALD_ZIP_PASSWORD
    },
    licences: {
      schedule: isProduction ? '0 4 * * 1,2,3,4,5' : '0 16 * * 1,2,3,4,5'
    },
    charging: {
      schedule: isProduction ? '0 2 * * 1,2,3,4,5' : '0 14 * * 1,2,3,4,5'
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
  }
};
