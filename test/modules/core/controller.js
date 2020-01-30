const { test, experiment } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');
const controller = require('../../../src/modules/core/controller');

experiment('modules/core/controller', () => {
  experiment('getStatus', () => {
    test('returns an object with the application version', () => {
      const response = controller.getStatus();
      expect(response.version).to.match(/^\d*\.\d*\.\d*$/);
    });
  });
});
