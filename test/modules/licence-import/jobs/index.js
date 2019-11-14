const { test, experiment } = exports.lab = require('lab').script();
const { expect } = require('code');

const jobs = require('../../../../src/modules/licence-import/jobs');

experiment('modules/licence-import/transform/jobs', () => {
  test('importCompany', async () => {
    const [job, data, options] = jobs.importCompany(1, 100);
    expect(job).to.equal(jobs.IMPORT_COMPANY_JOB);
    expect(data).to.equal({
      regionCode: 1,
      partyId: 100
    });
    expect(options).to.equal({
      singletonKey: 'import.company.1.100',
      singletonHours: 1,
      expireIn: '4 hour',
      priority: 1
    });
  });

  test('importLicences', async () => {
    const [job, data, options] = jobs.importLicences();
    expect(job).to.equal(jobs.IMPORT_LICENCES_JOB);
    expect(data).to.equal({});
    expect(options).to.equal({
      singletonKey: 'import.licences',
      singletonHours: 1,
      expireIn: '4 hour'
    });
  });

  test('importLicence', async () => {
    const [job, data, options] = jobs.importLicence('01/123');
    expect(job).to.equal(jobs.IMPORT_LICENCE_JOB);
    expect(data).to.equal({
      licenceNumber: '01/123'
    });
    expect(options).to.equal({
      singletonKey: 'import.licence.01/123',
      singletonHours: 1,
      expireIn: '4 hour',
      priority: 0
    });
  });
});
