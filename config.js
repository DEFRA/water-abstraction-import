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
  // | ----------------------------------- | --------------- | --------------- |
  // | Service                             | Local Dev Count | Non local count |
  // | ----------------------------------- | --------------- | --------------- |
  // | water-abstraction-import            |              40 |              10 |
  // | water-abstraction-permit-repository |              16 |               4 |
  // | water-abstraction-returns           |              20 |               5 |
  // | water-abstraction-service           |              80 |              20 |
  // | water-abstraction-tactical-crm      |              20 |               5 |
  // | water-abstraction-tactical-idm      |              20 |               5 |
  // | ----------------------------------- | --------------- | --------------- |
  // | TOTAL                               |             196 |              49 |
  // | ----------------------------------- | --------------- | --------------- |
  //
  pg: {
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'local' ? 40 : 10,
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
