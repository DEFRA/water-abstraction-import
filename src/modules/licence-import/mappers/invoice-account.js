const { groupBy, sortBy } = require('lodash');
const helpers = require('@envage/water-abstraction-helpers');
const date = require('./date');

const mapInvoiceAccount = chargeVersion => ({
  invoiceAccountNumber: chargeVersion.IAS_CUST_REF
});

const mapInvoiceAccountAddresses = (iasAccounts, context) => {
  // Sort group by transfer date
  const sorted = sortBy(iasAccounts, row => date.mapTransferDate(row.IAS_XFER_DATE));

  // Map to new data structure
  const addresses = sorted.map((row, i, arr) => ({
    startDate: date.mapTransferDate(row.IAS_XFER_DATE),
    endDate: i === arr.length - 1 ? null : date.getPreviousDay(date.mapTransferDate(arr[i + 1].IAS_XFER_DATE)),
    address: context.addresses[row.FGAC_REGION_CODE][row.ACON_AADD_ID]
  }));

  // Merge on date range
  return helpers.charging.mergeHistory(addresses);
};

const mapInvoiceAccounts = (iasAccounts, context) => {
  // Group by IAS customer ref (invoice account number)
  const groups = groupBy(iasAccounts, row => row.IAS_CUST_REF);
  return Object.values(groups).map(group => {
    const addresses = mapInvoiceAccountAddresses(group, context);

    return {
      invoiceAccountNumber: group[0].IAS_CUST_REF,
      addresses
    };
  });
};

exports.mapInvoiceAccount = mapInvoiceAccount;
exports.mapInvoiceAccounts = mapInvoiceAccounts;
