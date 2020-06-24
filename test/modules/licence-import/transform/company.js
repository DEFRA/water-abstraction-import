const { test, experiment, beforeEach } = exports.lab = require('@hapi/lab').script();
const { transformCompany } = require('../../../../src/modules/licence-import/transform/company');
const { expect } = require('@hapi/code');

const data = require('./data');
const createCompany = () => {
  const licence = data.createLicence();
  return {
    party: data.createPerson(),
    addresses: [
      data.createAddress(),
      data.createAddress({ ID: '1001' })
    ],
    invoiceAccounts: [
      data.createInvoiceAccount({
        IAS_CUST_REF: 'A1234',
        IAS_XFER_DATE: '02/04/2015',
        ACON_AADD_ID: '1000'
      }),
      data.createInvoiceAccount({
        IAS_CUST_REF: 'A1234',
        IAS_XFER_DATE: '06/07/2015',
        ACON_AADD_ID: '1001',
        licence_holder_party_id: '2345',
        invoice_account_party_name: 'Big Co Limited'
      }),
      data.createInvoiceAccount({
        IAS_CUST_REF: 'B7890',
        IAS_XFER_DATE: '13/08/2015',
        ACON_AADD_ID: '1001',
        licence_holder_party_id: '2346',
        invoice_account_party_name: 'Accurate Accountancy Plc.'
      })
    ],
    licenceVersions: [
      data.createVersion(licence, { ISSUE_NO: '1', INCR_NO: '1', EFF_ST_DATE: '02/04/2015', EFF_END_DATE: '05/07/2015' }),
      data.createVersion(licence, { ISSUE_NO: '1', INCR_NO: '2', EFF_ST_DATE: '06/07/2015', EFF_END_DATE: '12/08/2015' }),
      data.createVersion(licence, { ISSUE_NO: '2', INCR_NO: '1', EFF_ST_DATE: '13/08/2015', EFF_END_DATE: 'null' })
    ]
  };
};

experiment('modules/licence-import/transform/company.js', () => {
  let result;

  experiment('transformCompany', () => {
    experiment('for a company', () => {
      beforeEach(async () => {
        const companyData = createCompany();
        result = transformCompany(companyData);
      });

      test('company details are mapped correctly', async () => {
        expect(result.type).to.equal('person');
        expect(result.name).to.equal('SIR JOHN DOE');
        expect(result.externalId).to.equal('1:1001');
      });

      test('there should be an invoice account for each distinct IAS account number', async () => {
        expect(result.invoiceAccounts.length).to.equal(2);
      });

      test('the date ranges of the invoice accounts is determined by the IAS_XFER_DATE', async () => {
        const [first, second] = result.invoiceAccounts;
        expect(first.invoiceAccountNumber).to.equal('A1234');
        expect(first.startDate).to.equal('2015-04-02');
        expect(first.endDate).to.equal(null);
        expect(second.invoiceAccountNumber).to.equal('B7890');
        expect(second.startDate).to.equal('2015-08-13');
        expect(second.endDate).to.equal(null);
      });

      test('the first invoice account has the correct address history', async () => {
        expect(result.invoiceAccounts[0].addresses).to.have.length(2);
        const [first, second] = result.invoiceAccounts[0].addresses;
        expect(first.role).to.equal('billing');
        expect(first.startDate).to.equal('2015-04-02');
        expect(first.endDate).to.equal('2015-07-05');
        expect(first.address.externalId).to.equal('1:1000');
        expect(first.agentCompany.externalId).to.be.null();
        expect(second.role).to.equal('billing');
        expect(second.startDate).to.equal('2015-07-06');
        expect(second.endDate).to.equal(null);
        expect(second.address.externalId).to.equal('1:1001');
        expect(second.agentCompany.externalId).to.be.null();
      });

      test('the second invoice account has the correct address history', async () => {
        expect(result.invoiceAccounts[1].addresses).to.have.length(1);
        const [first] = result.invoiceAccounts[1].addresses;
        expect(first.role).to.equal('billing');
        expect(first.startDate).to.equal('2015-08-13');
        expect(first.endDate).to.equal(null);
        expect(first.address.externalId).to.equal('1:1001');
        expect(first.agentCompany.externalId).to.equal('1:1000');
      });

      test('there is 1 licence-holder address', async () => {
        const addresses = result.addresses.filter(row => row.role === 'licenceHolder');
        expect(addresses).to.have.length(1);
      });

      test('the licence-holder address is mapped from the licence versions', async () => {
        const [address] = result.addresses.filter(row => row.role === 'licenceHolder');
        expect(address.startDate).to.equal('2015-04-02');
        expect(address.endDate).to.equal(null);
        expect(address.address.externalId).to.equal('1:1000');
      });

      test('there are 2 billing addresses', async () => {
        const addresses = result.addresses.filter(row => row.role === 'billing');
        expect(addresses).to.have.length(2);
      });

      test('the billing addresses are mapped from the invoice accounts', async () => {
        const [first, second] = result.addresses.filter(row => row.role === 'billing');
        expect(first.startDate).to.equal('2015-04-02');
        expect(first.endDate).to.equal(null);
        expect(first.address.externalId).to.equal('1:1000');
        expect(second.startDate).to.equal('2015-07-06');
        expect(second.endDate).to.equal(null);
        expect(second.address.externalId).to.equal('1:1001');
      });

      test('there are 2 contacts', async () => {
        expect(result.contacts).to.have.length(2);
      });

      test('there is a licence-holder contact', async () => {
        const [first] = result.contacts;
        expect(first.role).to.equal('licenceHolder');
        expect(first.startDate).to.equal('2015-04-02');
        expect(first.endDate).to.equal(null);
        expect(first.contact.externalId).to.equal('1:1001');
      });

      test('there is a billing contact', async () => {
        const [, second] = result.contacts;
        expect(second.role).to.equal('billing');
        expect(second.startDate).to.equal('2015-04-02');
        expect(second.endDate).to.equal(null);
        expect(second.contact.externalId).to.equal('1:1001');
      });
    });
  });
});
