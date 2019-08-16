const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const helpers = require('../../../../../src/modules/charging-import/lib/check-integrity/helpers.js');
const sandbox = require('sinon').createSandbox();

experiment('modules/charging-import/lib/check-integrity/helpers.js', () => {

  experiment('isEqual', () => {
    test('returns true when arguments are the same', async() => {
      const result = helpers.isEqual('A', 'A');
      expect(result).to.equal(true);
    });

    test('returns false when arguments are different', async() => {
      const result = helpers.isEqual('A', 'B');
      expect(result).to.equal(false);
    });

    test('returns true when numbers expressed as exponentials are the same', async() => {
      const result = helpers.isEqual('0.001', '1E-03');
      expect(result).to.equal(true);
    });

    test('returns false when numbers expressed as exponentials are the different', async() => {
      const result = helpers.isEqual('0.001', '1E-04');
      expect(result).to.equal(false);
    });
  });

  experiment('verifyRow', () => {
    test('reports no errors when all fields in the target match the source', async() => {
      const result = helpers.verifyRow({
        foo : 'bar',
        bar : 'foo'
      }, {
        foo: 'bar'
      });
      expect(result.length).to.equal(0);
    });

    test('reports errors when not all fields in target match source', async() => {
      const source = {
        foo : 'bar',
        bar : 'foo'
      };
      const target = {
        foo: 'bar',
        bar : 'fob'
      }

      const result = helpers.verifyRow(source, target, 5);

      expect(result).to.equal([{
        message: 'Row 5 - difference in key bar',
        data: { source, target }
      }]);
    });
  });

  experiment('addError', () => {

    test('adds a single error to a list', async() => {
      const errors = ['error_1'];
      helpers.addError(errors, 'error_2');
      expect(errors).to.equal(['error_1', 'error_2']);
    }),

    test('adds an array of  errors to a list', async() => {
      const errors = ['error_1'];
      helpers.addError(errors, ['error_2', 'error_3']);
      expect(errors).to.equal(['error_1', 'error_2', 'error_3']);
    })

    test('does not add error to list if falsey', async() => {
      const errors = ['error_1'];
      helpers.addError(errors, null);
      expect(errors).to.equal(['error_1']);
    })
  })


});
