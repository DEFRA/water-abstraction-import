'use strict';

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { logger } = require('../../../../src/logger');
const deleteRemovedDocumentsCompleteJob = require('../../../../src/modules/nald-import/jobs/delete-removed-documents-complete');

const createJob = isFailed => ({
  failed: isFailed,
  data: {
    request: {
      name: 'nald-import.delete-removed-documents'
    }
  }
});

experiment('modules/nald-import/jobs/delete-removed-documents-complete', () => {
  let messageQueue;

  beforeEach(async () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');

    messageQueue = {
      publish: sandbox.stub(),
      deleteQueue: sandbox.stub()
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.handler', () => {
    experiment('when the job fails', () => {
      const job = createJob(true);

      beforeEach(async () => {
        await deleteRemovedDocumentsCompleteJob(job, messageQueue);
      });

      test('a message is logged', async () => {
        const [message] = logger.error.lastCall.args;
        expect(message).to.equal('Job: nald-import.delete-removed-documents failed, aborting');
      });

      test('no further jobs are published', async () => {
        expect(messageQueue.publish.called).to.be.false();
      });
    });

    experiment('when the job succeeds', () => {
      const job = createJob(false);

      beforeEach(async () => {
        await deleteRemovedDocumentsCompleteJob(job, messageQueue);
      });

      test('a message is logged', async () => {
        const [message] = logger.info.lastCall.args;
        expect(message).to.equal('Handling onComplete job: nald-import.delete-removed-documents');
      });

      test('a new job is published to populate the pending imports table', async () => {
        const [job] = messageQueue.publish.lastCall.args;
        expect(job.name).to.equal('nald-import.populate-pending-import');
      });

      experiment('when publishing a new job fails', () => {
        const err = new Error('oops');

        const job = createJob(false);

        beforeEach(async () => {
          messageQueue.publish.rejects(err);
        });

        test('an error message is logged and rethrown', async () => {
          const func = () => deleteRemovedDocumentsCompleteJob(job, messageQueue);
          await expect(func()).to.reject();

          const [message, error] = logger.error.lastCall.args;
          expect(message).to.equal('Error handling onComplete job: nald-import.delete-removed-documents');
          expect(error).to.equal(err);
        });
      });
    });
  });
});
