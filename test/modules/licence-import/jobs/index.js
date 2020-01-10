const { test, experiment } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const jobs = require('../../../../src/modules/licence-import/jobs');

experiment('modules/licence-import/transform/jobs', () => {
  test('importCompany', async () => {
    const { name, data, options } = jobs.importCompany(1, 100);
    expect(name).to.equal(jobs.IMPORT_COMPANY_JOB);
    expect(data).to.equal({
      regionCode: 1,
      partyId: 100
    });
    expect(options).to.equal({
      singletonKey: 'import.company.1.100',
      singletonHours: 1,
      expireIn: '4 hour'
    });
  });

  test('importCompanies', async () => {
    const { name, options } = jobs.importCompanies();
    expect(name).to.equal(jobs.IMPORT_COMPANIES_JOB);
    expect(options).to.equal({
      singletonKey: 'import.companies',
      singletonHours: 1,
      expireIn: '4 hour'
    });
  });

  test('importLicences', async () => {
    const { name, options } = jobs.importLicences();
    expect(name).to.equal(jobs.IMPORT_LICENCES_JOB);
    expect(options).to.equal({
      singletonKey: 'import.licences',
      singletonHours: 1,
      expireIn: '4 hour'
    });
  });

  test('importLicence', async () => {
    const { name, data, options } = jobs.importLicence('01/123');
    expect(name).to.equal(jobs.IMPORT_LICENCE_JOB);
    expect(data).to.equal({
      licenceNumber: '01/123'
    });
    expect(options).to.equal({
      singletonKey: 'import.licence.01/123',
      singletonHours: 1,
      expireIn: '4 hour'
    });
  });
});
