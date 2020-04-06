const cron = require('node-cron');
const jobs = require('./jobs');
const handlers = require('./handlers');
const { createRegister } = require('../../lib/plugin');

const getOptions = () => ({
  teamSize: 750,
  teamConcurrency: 1
});

const registerSubscribers = async server => {
  // The first step is to import a list of all companies into the water_import.company_import table
  await server.messageQueue.subscribe(jobs.IMPORT_COMPANIES_JOB, handlers.importCompanies);

  // When the water_import.company_import table is ready, jobs are scheduled to import each company
  await server.messageQueue.onComplete(jobs.IMPORT_COMPANIES_JOB,
    job => handlers.onCompleteImportCompanies(server.messageQueue, job)
  );

  // Import licenced when all companies are imported
  await server.messageQueue.onComplete(jobs.IMPORT_COMPANY_JOB,
    job => handlers.onCompleteImportCompany(server.messageQueue, job)
  );

  await server.messageQueue.subscribe(jobs.IMPORT_COMPANY_JOB, getOptions(), handlers.importCompany);
  await server.messageQueue.subscribe(jobs.IMPORT_LICENCES_JOB, handlers.importLicences);
  await server.messageQueue.onComplete(jobs.IMPORT_LICENCES_JOB,
    job => handlers.onCompleteImportLicences(server.messageQueue, job)
  );

  await server.messageQueue.subscribe(jobs.IMPORT_LICENCE_JOB, getOptions(), handlers.importLicence);

  // Set up cron job to import companies every other day at 3:10pm
  cron.schedule('10 15 */2 * *', async () => {
    await server.messageQueue.publish(jobs.importCompanies());
  });
};

exports.plugin = {
  name: 'importLicenceData',
  dependencies: ['pgBoss'],
  register: server => createRegister(server, registerSubscribers)
};
