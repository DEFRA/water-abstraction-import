const {
  experiment,
  test
} = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

const { mapLicence } = require('../../../../../src/modules/licence-import/transform/mappers/licence');

experiment('modules/licence-import/transform/mappers/licence', () => {
  experiment('.mapLicence', () => {
    test('sets the licenceNumber', async () => {
      const licenceNumber = 'test-licence';
      const input = { LIC_NO: licenceNumber, AREP_EIUC_CODE: 'ANOTH' };
      const mapped = mapLicence(input);
      expect(mapped.licenceNumber).to.equal(licenceNumber);
    });

    test('sets the startDate when the original effective date is not null', async () => {
      const input = { ORIG_EFF_DATE: '01/02/2003', AREP_EIUC_CODE: 'ANOTH' };
      const mapped = mapLicence(input);
      expect(mapped.startDate).to.equal('2003-02-01');
    });

    test('gets the start date from the earliest non-draft licence version if the original effective date is null', async () => {
      const licence = { ORIG_EFF_DATE: 'null', AREP_EIUC_CODE: 'ANOTH' };
      const licenceVersions = [{
        STATUS: 'DRAFT',
        EFF_ST_DATE: '01/01/2018'
      }, {
        STATUS: 'SUPER',
        EFF_ST_DATE: '02/01/2018'
      }, {
        STATUS: 'CURR',
        EFF_ST_DATE: '03/01/2018'
      }];
      const mapped = mapLicence(licence, licenceVersions);
      expect(mapped.startDate).to.equal('2018-01-02');
    });

    test('sets the end date to the minimum date', async () => {
      const input = {
        EXPIRY_DATE: '01/01/2003',
        REV_DATE: 'null',
        LAPSED_DATE: '01/01/2005',
        AREP_EIUC_CODE: 'ANOTH'
      };

      const mapped = mapLicence(input);

      expect(mapped.endDate).to.equal('2003-01-01');
    });

    test('sets documents to an empty array', async () => {
      const input = { AREP_EIUC_CODE: 'ANOTH' };
      const mapped = mapLicence(input);
      expect(mapped.documents).to.equal([]);
    });

    test('sets agreements to an empty array', async () => {
      const input = { AREP_EIUC_CODE: 'ANOTH' };
      const mapped = mapLicence(input);
      expect(mapped.agreements).to.equal([]);
    });

    test('creates an external id', async () => {
      const input = {
        FGAC_REGION_CODE: 'region',
        ID: 'id',
        AREP_EIUC_CODE: 'ANOTH'
      };
      const mapped = mapLicence(input);
      expect(mapped.externalId).to.equal('region:id');
    });

    experiment('.isWaterUndertaker', () => {
      test('is false if the AREP_EIUC_CODE does not end with "SWC"', async () => {
        const input = {
          AREP_EIUC_CODE: 'SOOTH'
        };
        const mapped = mapLicence(input);
        expect(mapped.isWaterUndertaker).to.be.false();
      });

      test('is true if the AREP_EIUC_CODE ends with "SWC"', async () => {
        const input = {
          AREP_EIUC_CODE: 'SOSWC'
        };
        const mapped = mapLicence(input);
        expect(mapped.isWaterUndertaker).to.be.true();
      });
    });

    test('sets the expired date', async () => {
      const input = { EXPIRY_DATE: '31/10/2012', AREP_EIUC_CODE: 'ANOTH' };

      const mapped = mapLicence(input);
      expect(mapped.expiredDate).to.equal('2012-10-31');
    });

    test('sets the lapsed date', async () => {
      const input = { LAPSED_DATE: '01/05/2009', AREP_EIUC_CODE: 'ANOTH' };

      const mapped = mapLicence(input);
      expect(mapped.lapsedDate).to.equal('2009-05-01');
    });

    test('sets the revoked date', async () => {
      const input = { REV_DATE: '30/06/2010', AREP_EIUC_CODE: 'ANOTH' };

      const mapped = mapLicence(input);
      expect(mapped.revokedDate).to.equal('2010-06-30');
    });

    experiment('.regions', () => {
      test('sets the historicalAreaCode', async () => {
        const input = { AREP_AREA_CODE: 'TEST', AREP_EIUC_CODE: 'ANOTH' };
        const mapped = mapLicence(input);

        expect(mapped.regions.historicalAreaCode).to.equal('TEST');
      });

      [
        { in: 'ANOTH', expected: 'Anglian' },
        { in: 'ANSWC', expected: 'Anglian' },
        { in: 'MDOTH', expected: 'Midlands' },
        { in: 'MDSWC', expected: 'Midlands' },
        { in: 'NOOTH', expected: 'Northumbria' },
        { in: 'NOSWC', expected: 'Northumbria' },
        { in: 'NWOTH', expected: 'North West' },
        { in: 'NWSWC', expected: 'North West' },
        { in: 'SOOTH', expected: 'Southern' },
        { in: 'SOSWC', expected: 'Southern' },
        { in: 'SWOTH', expected: 'South West (incl Wessex)' },
        { in: 'SWSWC', expected: 'South West (incl Wessex)' },
        { in: 'THOTH', expected: 'Thames' },
        { in: 'THSWC', expected: 'Thames' },
        { in: 'WLOTH', expected: 'Wales' },
        { in: 'WLSWC', expected: 'Wales' },
        { in: 'YOOTH', expected: 'Yorkshire' },
        { in: 'YOSWC', expected: 'Yorkshire' }
      ].forEach(data => {
        test(`sets regionalChargeArea to ${data.expected} for ${data.in}`, async () => {
          const input = {
            AREP_EIUC_CODE: data.in
          };
          const mapped = mapLicence(input);
          expect(mapped.regions.regionalChargeArea).to.equal(data.expected);
        });
      });
    });

    experiment('.regionCode', () => {
      test('copies a numeric value from the source data', async () => {
        const input = { FGAC_REGION_CODE: 1, AREP_EIUC_CODE: 'ANOTH' };
        const mapped = mapLicence(input);
        expect(mapped.regionCode).to.equal(1);
      });

      test('converts a string value from the source data to a number', async () => {
        const input = { FGAC_REGION_CODE: '1', AREP_EIUC_CODE: 'ANOTH' };
        const mapped = mapLicence(input);
        expect(mapped.regionCode).to.equal(1);
      });
    });
  });
});
