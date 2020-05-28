'use strict';

const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');
const sandbox = require('sinon').createSandbox();

const purposes = require('../../../../../src/modules/nald-import/lib/nald-queries/purposes');
const cache = require('../../../../../src/modules/nald-import/lib/nald-queries/cache');
const db = require('../../../../../src/modules/nald-import/lib/db');
const sql = require('../../../../../src/modules/nald-import/lib/nald-queries/sql/purposes');

experiment('modules/nald-import/lib/queries/purposes', () => {
  beforeEach(async () => {
    sandbox.stub(db, 'dbQuery');
    sandbox.stub(cache, 'createCachedQuery');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('.getPurpose', () => {
    experiment('._createPurposeCache', async () => {
      test('creates a cache with the expected method name', async () => {
        purposes._createPurposeCache();
        const [, methodName] = cache.createCachedQuery.lastCall.args;
        expect(methodName).to.equal('getPurpose');
      });

      test('creates a cache with the required generate func', async () => {
        purposes._createPurposeCache();
        const [, , generate] = cache.createCachedQuery.lastCall.args;
        const id = { primary: 'test-1', secondary: 'test-2', tertiary: 'test-3' };

        await generate(id);

        const [query, params] = db.dbQuery.lastCall.args;

        expect(query).to.equal(sql.getPurpose);
        expect(params).to.equal(['test-1', 'test-2', 'test-3']);
      });
    });

    test('passes the expected id object to the cache provider', async () => {
      sandbox.stub(purposes._getPurposeCache, 'get');

      await purposes.getPurpose({ primary: 'test-1', secondary: 'test-2', tertiary: 'test-3' });

      const [id] = purposes._getPurposeCache.get.lastCall.args;

      expect(id.id).to.equal('purpose:primary:test-1:secondary:test-2:tertiary:test-3');
      expect(id.primary).to.equal('test-1');
      expect(id.secondary).to.equal('test-2');
      expect(id.tertiary).to.equal('test-3');
    });
  });

  experiment('.getPurposes', () => {
    experiment('when called with an increment and issue number', () => {
      test('passes the expected params', async () => {
        await purposes.getPurposes('test-lic', 'test-reg', 'test-iss', 'test-inc');
        const [, params] = db.dbQuery.lastCall.args;
        expect(params).to.equal(['test-lic', 'test-reg', 'test-iss', 'test-inc']);
      });
    });

    experiment('when called without an increment and issue number', () => {
      test('passes the expected params', async () => {
        await purposes.getPurposes('test-lic', 'test-reg');
        const [, params] = db.dbQuery.lastCall.args;
        expect(params).to.equal(['test-lic', 'test-reg']);
      });
    });
  });

  experiment('.getPurposePoints', () => {
    beforeEach(async () => {
      await purposes.getPurposePoints('test-purpose', 'test-region');
    });

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args;
      expect(query).to.equal(sql.getPurposePoints);
    });

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args;
      expect(params).to.equal(['test-purpose', 'test-region']);
    });
  });

  experiment('.getPurposePointLicenceAgreements', () => {
    beforeEach(async () => {
      await purposes.getPurposePointLicenceAgreements('test-id', 'test-region');
    });

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args;
      expect(query).to.equal(sql.getPurposePointLicenceAgreements);
    });

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args;
      expect(params).to.equal(['test-id', 'test-region']);
    });
  });

  experiment('.getPurposePointLicenceConditions', () => {
    beforeEach(async () => {
      await purposes.getPurposePointLicenceConditions('test-id', 'test-region');
    });

    test('uses the correct query', async () => {
      const [query] = db.dbQuery.lastCall.args;
      expect(query).to.equal(sql.getPurposePointLicenceConditions);
    });

    test('passes the expected params to the database query', async () => {
      const [, params] = db.dbQuery.lastCall.args;
      expect(params).to.equal(['test-id', 'test-region']);
    });
  });
});
