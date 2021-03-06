'use strict';

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const { logger } = require('../../../../src/logger');
const extractService = require('../../../../src/modules/nald-import/services/extract-service.js');
const applicationStateService = require('../../../../src/lib/services/application-state-service.js');
const s3Service = require('../../../../src/modules/nald-import/services/s3-service.js');

const s3Download = require('../../../../src/modules/nald-import/jobs/s3-download');
const config = require('../../../../config');

const testDownloadOccurs = () => {
  test('a message is logged', async () => {
    const [message] = logger.info.lastCall.args;
    expect(message).to.equal('Handling job: nald-import.s3-download');
  });

  test('updates the application state with the new etag', async () => {
    expect(applicationStateService.save.firstCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: false }]);
  });

  test('downloads and extracts from S3 bucket', async () => {
    expect(extractService.downloadAndExtract.called).to.be.true();
  });

  test('updates the application state when file imported', async () => {
    expect(applicationStateService.save.secondCall.args).to.equal(['nald-import', { etag: 'test-etag', isDownloaded: true }]);
  });
};

experiment('modules/nald-import/jobs/s3-download', () => {
  beforeEach(async () => {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'error');

    sandbox.stub(extractService, 'downloadAndExtract');

    sandbox.stub(applicationStateService, 'get');
    sandbox.stub(applicationStateService, 'save');

    sandbox.stub(s3Service, 'getEtag').resolves('test-etag');

    sandbox.stub(config.import.nald, 'isEtagCheckEnabled').value(true);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.createMessage', () => {
    test('formats a message for PG boss', async () => {
      const job = s3Download.createMessage();
      expect(job).to.equal({
        name: 'nald-import.s3-download',
        options: {
          expireIn: '1 hours',
          singletonKey: 'nald-import.s3-download'
        }
      });
    });
  });

  experiment('.handler', () => {
    let result;

    const job = {
      name: 'nald-import.s3-download'
    };

    experiment('when there is no import state stored', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({});
        result = await s3Download.handler(job);
      });

      testDownloadOccurs();

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: {},
          isRequired: true
        });
      });
    });

    experiment('when the import state indicates download did not complete', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: false
        });
        result = await s3Download.handler(job);
      });

      testDownloadOccurs();

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'test-etag', isDownloaded: false },
          isRequired: true
        });
      });
    });

    experiment('when the import state indicates etag has changed', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'some-old-etag',
          isDownloaded: true
        });
        result = await s3Download.handler(job);
      });

      testDownloadOccurs();

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'some-old-etag', isDownloaded: true },
          isRequired: true
        });
      });
    });

    experiment('when the import state indicates etag has not changed', () => {
      beforeEach(async () => {
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: true
        });
        result = await s3Download.handler(job);
      });

      test('the application state is not updated', async () => {
        expect(applicationStateService.save.called).to.be.false();
      });

      test('the file is not imported from S3', async () => {
        expect(extractService.downloadAndExtract.called).to.be.false();
      });

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'test-etag', isDownloaded: true },
          isRequired: false
        });
      });
    });

    experiment('when the config disables etag check and the etag has not changed', () => {
      beforeEach(async () => {
        sandbox.stub(config.import.nald, 'isEtagCheckEnabled').value(false);
        applicationStateService.get.resolves({
          etag: 'test-etag',
          isDownloaded: true
        });
        result = await s3Download.handler(job);
      });

      test('the handler resolves with the expected values', async () => {
        expect(result).to.equal({
          etag: 'test-etag',
          state: { etag: 'test-etag', isDownloaded: true },
          isRequired: true
        });
      });
    });

    experiment('when the job fails', () => {
      const err = new Error('Oops!');

      beforeEach(async () => {
        s3Service.getEtag.throws(err);
      });

      test('logs an error message', async () => {
        const func = () => s3Download.handler(job);
        await expect(func()).to.reject();
        expect(logger.error.calledWith(
          'Error handling job nald-import.s3-download', err
        )).to.be.true();
      });

      test('rethrows the error', async () => {
        const func = () => s3Download.handler(job);
        const err = await expect(func()).to.reject();
        expect(err.message).to.equal('Oops!');
      });
    });
  });
});
