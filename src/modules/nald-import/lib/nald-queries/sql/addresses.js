'use strict';

const getAddress = `
  select a.*
  from import."NALD_ADDRESSES" a
  where "ID"=$1 and "FGAC_REGION_CODE" = $2;
`;

exports.getAddress = getAddress;
