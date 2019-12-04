const { test, experiment, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const sandbox = require('sinon').createSandbox();

const extract = require('../../../../src/modules/licence-import/extract/');
const importConnector = require('../../../../src/modules/licence-import/extract/connectors');

const data = {
  licence: { ID: '7', FGAC_REGION_CODE: '4' },
  parties: { isParties: true },
  party: { isParty: true },
  addresses: { isAddresses: true },
  licenceVersions: [
    { ACON_APAR_ID: 'party_1', ACON_AADD_ID: 'address_1' }
  ],
  chargeVersions: [
    { ACON_APAR_ID: 'party_2', ACON_AADD_ID: 'address_2' }
  ],
  invoiceAccounts: [
    { ACON_APAR_ID: 'party_3', ACON_AADD_ID: 'address_3' }
  ],
  twoPartTariffAgreements: { isTwoPartTariffAgreements: true },
  section130Agreements: { isSection130Agreements: true }
};

experiment('modules/licence-import/extract/index.js', () => {
  let result;

  beforeEach(async () => {
    sandbox.stub(importConnector, 'getParties').resolves(data.parties);
    sandbox.stub(importConnector, 'getParty').resolves(data.party);
    sandbox.stub(importConnector, 'getAddresses').resolves(data.addresses);
    sandbox.stub(importConnector, 'getLicence').resolves(data.licence);
    sandbox.stub(importConnector, 'getLicenceVersions').resolves(data.licenceVersions);
    sandbox.stub(importConnector, 'getChargeVersions').resolves(data.chargeVersions);
    sandbox.stub(importConnector, 'getTwoPartTariffAgreements').resolves(data.twoPartTariffAgreements);
    sandbox.stub(importConnector, 'getSection130Agreements').resolves(data.section130Agreements);
    sandbox.stub(importConnector, 'getInvoiceAccounts').resolves(data.invoiceAccounts);
    sandbox.stub(importConnector, 'getPartyLicenceVersions').resolves(data.licenceVersions);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  experiment('getLicenceData', () => {
    beforeEach(async () => {
      result = await extract.getLicenceData('01/123');
    });

    test('importConnector.getLicence is called with the licence number', async () => {
      expect(
        importConnector.getLicence.calledWith('01/123')
      ).to.be.true();
    });

    test('importConnector.getLicenceVersions is called with the region code / licence ID', async () => {
      expect(
        importConnector.getLicenceVersions.calledWith('4', '7')
      ).to.be.true();
    });

    test('importConnector.getChargeVersions is called with the region code / licence ID', async () => {
      expect(
        importConnector.getChargeVersions.calledWith('4', '7')
      ).to.be.true();
    });

    test('importConnector.getTwoPartTariffAgreements is called with the region code / licence ID', async () => {
      expect(
        importConnector.getTwoPartTariffAgreements.calledWith('4', '7')
      ).to.be.true();
    });

    test('importConnector.getSection130Agreements is called with the region code / licence ID', async () => {
      expect(
        importConnector.getSection130Agreements.calledWith('4', '7')
      ).to.be.true();
    });

    test('importConnector.getParties called with region code and array of party IDs', async () => {
      expect(
        importConnector.getParties.calledWith('4', ['party_1', 'party_2'])
      ).to.be.true();
    });

    test('importConnector.getAddresses called with region code and array of address IDs', async () => {
      expect(
        importConnector.getAddresses.calledWith('4', ['address_1', 'address_2'])
      ).to.be.true();
    });

    test('resolves with the retrieved data', async () => {
      expect(result.licence).to.equal(data.licence);
      expect(result.versions).to.equal(data.licenceVersions);
      expect(result.chargeVersions).to.equal(data.chargeVersions);
      expect(result.tptAgreements).to.equal(data.twoPartTariffAgreements);
      expect(result.section130Agreements).to.equal(data.section130Agreements);
      expect(result.parties).to.equal(data.parties);
      expect(result.addresses).to.equal(data.addresses);
    });
  });

  experiment('getCompanyData', () => {
    beforeEach(async () => {
      result = await extract.getCompanyData(5, 123);
    });

    test('importConnector.getParty is called with region code and party ID', async () => {
      expect(importConnector.getParty.calledWith(5, 123)).to.be.true();
    });

    test('importConnector.getInvoiceAccounts is called with region code and party ID', async () => {
      expect(importConnector.getInvoiceAccounts.calledWith(5, 123)).to.be.true();
    });

    test('importConnector.getPartyLicenceVersions is called with region code and party ID', async () => {
      expect(importConnector.getPartyLicenceVersions.calledWith(5, 123)).to.be.true();
    });

    test('importConnector.addresses is called with region code and array of address IDs', async () => {
      expect(importConnector.getAddresses.calledWith(5, ['address_1', 'address_3'])).to.be.true();
    });

    test('resolves with the data', async () => {
      expect(result.party).to.equal(data.party);
      expect(result.addresses).to.equal(data.addresses);
      expect(result.invoiceAccounts).to.equal(data.invoiceAccounts);
      expect(result.licenceVersions).to.equal(data.licenceVersions);
    });
  });
});
