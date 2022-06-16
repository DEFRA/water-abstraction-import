const { set } = require('lodash');
const str = require('./str');
const { createRegionSkeleton } = require('./region-skeleton');

const mapAddress = address => ({
  address1: str.mapNull(address.ADDR_LINE1),
  address2: str.mapNull(address.ADDR_LINE2),
  address3: str.mapNull(address.ADDR_LINE3),
  address4: str.mapNull(address.ADDR_LINE4),
  town: str.mapNull(address.TOWN),
  county: str.mapNull(address.COUNTY),
  postcode: str.mapNull(address.POSTCODE),
  country: str.mapNull(address.COUNTRY),
  externalId: `${address.FGAC_REGION_CODE}:${address.ID}`,
  _nald: address
});

const mapAddresses = addresses => addresses.reduce((acc, address) => {
  set(acc, `${address.FGAC_REGION_CODE}.${address.ID}`, mapAddress(address));
  return acc;
}, createRegionSkeleton());

module.exports = {
  mapAddress,
  mapAddresses
};
