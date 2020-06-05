'use strict';

const { afterEach, beforeEach, experiment, test } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();
const moment = require('moment');
moment.locale('en-gb');

const applicationStateConnector = require('../../../../src/lib/connectors/water/application-state');
const applicationStateService = require('../../../../src/modules/nald-import/services/application-state-service');

experiment('modules/nald-import/services/application-state-service', () => {
  beforeEach(async () => {
    sandbox.stub(applicationStateConnector, 'getState').resolves({
      data: {
        etag: 'test-etag'
      }
    });
    sandbox.stub(applicationStateConnector, 'postState');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.get', () => {
    let result;

    beforeEach(async () => {
      result = await applicationStateService.get();
    });

    test('the application state coonector is called with the correct key', async () => {
      expect(applicationStateConnector.getState.calledWith('nald-import')).to.be.true();
    });

    test('resolves with the data', async () => {
      expect(result).to.equal({ etag: 'test-etag' });
    });
  });

  experiment('.save', () => {
    experiment('when the isDownloaded argument is omitted', () => {
      beforeEach(async () => {
        await applicationStateService.save('a-new-etag');
      });

      test('the application state connector is called with the correct key', async () => {
        const [key] = applicationStateConnector.postState.lastCall.args;
        expect(key).to.equal('nald-import');
      });

      test('the etag is updated, and isDownloaded defaults to false', async () => {
        const [, data] = applicationStateConnector.postState.lastCall.args;
        expect(data).to.equal({
          etag: 'a-new-etag',
          isDownloaded: false
        });
      });
    });

    experiment('when the isDownloaded argument is included', () => {
      beforeEach(async () => {
        await applicationStateService.save('a-new-etag', true);
      });

      test('isDownloaded is set to the value provided', async () => {
        const [, data] = applicationStateConnector.postState.lastCall.args;
        expect(data.isDownloaded).to.be.true();
      });
    });
  });
});
