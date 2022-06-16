'use strict';

const getCams = `
  select *
  from import."NALD_REP_UNITS"
  where "CODE" = $1 and "FGAC_REGION_CODE" = $2;
`;

module.exports = {
  getCams
};
