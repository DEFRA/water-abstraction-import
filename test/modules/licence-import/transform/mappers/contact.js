const { test, experiment } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const contact = require('../../../../../src/modules/licence-import/transform/mappers/contact');

experiment('modules/licence-import/mappers/contact', () => {
  experiment('mapContact', () => {
    test('for organisations, a contact is null', async () => {
      const result = contact.mapContact({
        NAME: 'BIG CO LTD',
        APAR_TYPE: 'ORG'
      });
      expect(result).to.equal(null);
    });

    test('for a person with no forename, the initials are used as the first name', async () => {
      const result = contact.mapContact({
        ID: '5',
        FGAC_REGION_CODE: '2',
        NAME: 'DOE',
        SALUTATION: 'MR',
        FORENAME: 'null',
        INITIALS: 'J',
        APAR_TYPE: 'PER'
      });

      expect(result.externalId).to.equal('2:5');
      expect(result.lastName).to.equal('DOE');
      expect(result.firstName).to.equal(null);
      expect(result.initials).to.equal('J');
      expect(result.salutation).to.equal('MR');
    });

    test('for a person with a forename, the initials are ignored', async () => {
      const result = contact.mapContact({
        ID: '5',
        FGAC_REGION_CODE: '2',
        NAME: 'DOE',
        SALUTATION: 'MR',
        FORENAME: 'JOHN',
        INITIALS: 'J',
        APAR_TYPE: 'PER'
      });

      expect(result.externalId).to.equal('2:5');
      expect(result.lastName).to.equal('DOE');
      expect(result.firstName).to.equal('JOHN');
      expect(result.salutation).to.equal('MR');
    });
  });
});
