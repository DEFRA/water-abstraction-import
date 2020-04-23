const { test, experiment } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const jobs = require('../../../../src/modules/charging-import/jobs');

experiment('modules/charging-import/transform/jobs', () => {
  test('importChargingData', async () => {
    const { name, data, options } = jobs.importChargingData();
    expect(name).to.equal(jobs.IMPORT_CHARGING_DATA);
    expect(data).to.be.undefined();
    expect(options).to.equal({
      singletonKey: jobs.IMPORT_CHARGING_DATA,
      singletonHours: 1,
      expireIn: '4 hour'
    });
  });
});
