'use strict';

const {
  experiment,
  test,
  beforeEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');

const mapper = require('../../../../../src/modules/licence-import/transform/mappers/document');

experiment('modules/licence-import/transform/mappers/document', () => {
  experiment('.mapLicenceToDocument', () => {
    let licence, document;

    beforeEach(async () => {
      licence = {
        licenceNumber: '123/123',
        startDate: '2020-01-01',
        endDate: '2021-01-01',
        externalId: 'external-id',
        _nald: { foo: 'bar' }
      };

      document = mapper.mapLicenceToDocument(licence);
    });

    test('maps the licence to a document', async () => {
      expect(document.documentRef).to.equal(licence.licenceNumber);
      expect(document.startDate).to.equal(licence.startDate);
      expect(document.endDate).to.equal(licence.endDate);
      expect(document.externalId).to.equal(licence.externalId);
      expect(document.roles).to.be.an.empty().array();
      expect(document._nald).to.equal(licence._nald);
    });
  });
});
