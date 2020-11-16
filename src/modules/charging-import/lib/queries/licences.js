'use strict';

const getLicences = `
SELECT
l."LIC_NO",
l."FGAC_REGION_CODE",
l."ID",
to_date(l."ORIG_EFF_DATE", 'DD/MM/YYYY') as start_date,
least(
  to_date(nullif(l."EXPIRY_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(nullif(l."REV_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(nullif(l."LAPSED_DATE", 'null'), 'DD/MM/YYYY')
) as end_date
FROM import."NALD_ABS_LICENCES" l 
WHERE "ORIG_EFF_DATE"<>'null'
`;

exports.getLicences = getLicences;
