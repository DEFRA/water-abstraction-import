'use strict';

const {
  experiment,
  test,
  beforeEach
} = exports.lab = require('@hapi/lab').script();

const { expect } = require('@hapi/code');

const mapper = require('../../../../../src/modules/licence-import/transform/mappers/document');

experiment('modules/licence-import/transform/mappers/document', () => {
  experiment('for a single licence version and a single increment', () => {
    let versions;
    let licence;
    let document;

    beforeEach(async () => {
      licence = {
        licenceNumber: '123/123',
        endDate: null
      };

      versions = [
        {
          ISSUE_NO: '100',
          STATUS: 'CURR',
          EFF_ST_DATE: '18/10/2006',
          EFF_END_DATE: 'null',
          FGAC_REGION_CODE: '1',
          AABL_ID: '123',
          INCR_NO: '0'
        }
      ];

      document = mapper.mapDocuments(versions, licence)[0];
    });

    test('sets documentRef from the licence number', async () => {
      expect(document.documentRef).to.equal(licence.licenceNumber);
    });

    test('sets the version number to the ISSUE_NO for the version', async () => {
      expect(document.versionNumber).to.equal(100);
    });

    test('sets the status to the most recent increment status', async () => {
      expect(document.status).to.equal('current');
    });

    test('sets the start date to the start date of the first increment', async () => {
      expect(document.startDate).to.equal('2006-10-18');
    });

    test('sets the end date to null when licence end date and version end dates are null', async () => {
      expect(document.endDate).to.equal(null);
    });

    test('creates the expected external id', async () => {
      expect(document.externalId).to.equal('1:123:100');
    });

    test('creates an empty array of roles', async () => {
      expect(document.roles).to.equal([]);
    });
  });

  experiment('for a single licence version with two increment numbers', () => {
    let versions;
    let licence;
    let document;

    beforeEach(async () => {
      licence = {
        licenceNumber: '123/123',
        endDate: null
      };

      versions = [
        {
          AABL_ID: '123',
          EFF_ST_DATE: '12/12/2012',
          EFF_END_DATE: '10/10/2020',
          FGAC_REGION_CODE: '1',
          INCR_NO: '0',
          ISSUE_NO: '100',
          STATUS: 'SUPER'
        },
        {
          AABL_ID: '123',
          EFF_ST_DATE: '11/10/2020',
          EFF_END_DATE: '01/02/2300',
          FGAC_REGION_CODE: '1',
          INCR_NO: '1',
          ISSUE_NO: '100',
          STATUS: 'CURR'
        }
      ];

      document = mapper.mapDocuments(versions, licence)[0];
    });

    test('sets documentRef from the licence number', async () => {
      expect(document.documentRef).to.equal(licence.licenceNumber);
    });

    test('sets the version number to the ISSUE_NO for the version', async () => {
      expect(document.versionNumber).to.equal(100);
    });

    test('sets the status to the most recent increment status', async () => {
      expect(document.status).to.equal('current');
    });

    test('sets the end date to the end date of the most recent increment', async () => {
      expect(document.endDate).to.equal('2300-02-01');
    });

    test('creates the expected external id', async () => {
      expect(document.externalId).to.equal('1:123:100');
    });

    test('creates an empty array of roles', async () => {
      expect(document.roles).to.equal([]);
    });
  });

  experiment('for two licence versions with two increment numbers', () => {
    let versions;
    let licence;
    let documents;

    beforeEach(async () => {
      licence = {
        licenceNumber: '123/123',
        endDate: null
      };

      versions = [
        {
          AABL_ID: '123',
          EFF_ST_DATE: '01/01/2000',
          EFF_END_DATE: '01/01/2001',
          FGAC_REGION_CODE: '1',
          INCR_NO: '0',
          ISSUE_NO: '100',
          STATUS: 'SUPER'
        },
        {
          AABL_ID: '123',
          EFF_ST_DATE: '02/01/2001',
          EFF_END_DATE: '01/01/2002',
          FGAC_REGION_CODE: '1',
          INCR_NO: '1',
          ISSUE_NO: '100',
          STATUS: 'CURR'
        },
        {
          AABL_ID: '123',
          EFF_ST_DATE: '02/02/2002',
          EFF_END_DATE: '01/01/2003',
          FGAC_REGION_CODE: '1',
          INCR_NO: '0',
          ISSUE_NO: '101',
          STATUS: 'SUPER'
        },
        {
          AABL_ID: '123',
          EFF_ST_DATE: '02/01/2003',
          EFF_END_DATE: 'null',
          FGAC_REGION_CODE: '1',
          INCR_NO: '1',
          ISSUE_NO: '101',
          STATUS: 'CURR'
        }
      ];

      documents = mapper.mapDocuments(versions, licence);
    });

    experiment('the first document', () => {
      test('sets documentRef from the licence number', async () => {
        expect(documents[0].documentRef).to.equal(licence.licenceNumber);
      });

      test('uses the first ISSUE_NO for the version number', async () => {
        expect(documents[0].versionNumber).to.equal(100);
      });

      test('sets the status to the most recent increment status', async () => {
        expect(documents[0].status).to.equal('current');
      });

      test('sets the end date to the end date of the most recent increment', async () => {
        expect(documents[0].endDate).to.equal('2002-01-01');
      });

      test('creates the expected external id', async () => {
        expect(documents[0].externalId).to.equal('1:123:100');
      });

      test('creates an empty array of roles', async () => {
        expect(documents[0].roles).to.equal([]);
      });
    });

    experiment('the second document', () => {
      test('sets documentRef from the licence number', async () => {
        expect(documents[1].documentRef).to.equal(licence.licenceNumber);
      });

      test('uses the first ISSUE_NO for the version number', async () => {
        expect(documents[1].versionNumber).to.equal(101);
      });

      test('sets the status to the most recent increment status', async () => {
        expect(documents[1].status).to.equal('current');
      });

      test('sets the end date to the end date of the most recent increment', async () => {
        expect(documents[1].endDate).to.equal(null);
      });

      test('creates the expected external id', async () => {
        expect(documents[1].externalId).to.equal('1:123:101');
      });

      test('creates an empty array of roles', async () => {
        expect(documents[1].roles).to.equal([]);
      });
    });
  });

  experiment('when the licence has an end date but the versions do not', () => {
    test('the licence end date is used', async () => {
      const licence = {
        licenceNumber: '123/123',
        endDate: '2020-01-01'
      };

      const versions = [
        {
          AABL_ID: '123',
          EFF_ST_DATE: '11/10/2020',
          EFF_END_DATE: 'null',
          FGAC_REGION_CODE: '1',
          INCR_NO: '1',
          ISSUE_NO: '100',
          STATUS: 'CURR'
        }
      ];

      const document = mapper.mapDocuments(versions, licence)[0];

      expect(document.endDate).to.equal('2020-01-01');
    });
  });

  experiment('when the licence and the licence version have different end dates', () => {
    test('the earliest date is used', async () => {
      const licence = {
        licenceNumber: '123/123',
        endDate: '2020-01-01'
      };

      const versions = [
        {
          AABL_ID: '123',
          EFF_ST_DATE: '11/10/2020',
          EFF_END_DATE: '02/02/2020',
          FGAC_REGION_CODE: '1',
          INCR_NO: '1',
          ISSUE_NO: '100',
          STATUS: 'CURR'
        }
      ];

      const document = mapper.mapDocuments(versions, licence)[0];

      expect(document.endDate).to.equal('2020-01-01');
    });
  });
});
