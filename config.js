const testMode = parseInt(process.env.TEST_MODE) === 1;

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

  // Database has 198 available connections
  //
  // Outside of development each process runs on 2 instances on 2 cores.
  // So there will be 4 connection pools per service but just 1 locally
  //
  // Allocations:
  //
  // | ----------------------------------- | ------- | ---------- | --------- | ---------- |
  // | Service                             | Local   | Local      | Non local | Non local  |
  // |                                     | process | connection | process   | connection |
  // |                                     | count   | count      | count     | count      |
  // | ----------------------------------- | ------- | ---------- | --------- | ---------- |
  // | water-abstraction-import            |       1 |         20 |         2 | (20)    10 |
  // | water-abstraction-permit-repository |       1 |         16 |         4 | (16)     4 |
  // | water-abstraction-returns           |       1 |         20 |         4 | (20)     5 |
  // | water-abstraction-service           |       2 | (100)   50 |         5 | (100)   20 |
  // | water-abstraction-tactical-crm      |       1 |         20 |         4 | (20)     5 |
  // | water-abstraction-tactical-idm      |       1 |         20 |         4 | (20)     5 |
  // | ----------------------------------- | ------- | ---------- | --------- | ---------- |
  // | TOTAL                               |       6 |        196 |        23 |        196 |
  // | ----------------------------------- | ------- | ---------- | --------- | ---------- |
  //
  pg: {
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'local' ? 20 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
  },

  pgBoss: {
    schema: 'water_import',
    application_name: process.env.SERVICE_NAME,
    newJobCheckIntervalSeconds: 5
  },

  server: {
    port: 8007,
    router: {
      stripTrailingSlash: true
    }
  }
};
