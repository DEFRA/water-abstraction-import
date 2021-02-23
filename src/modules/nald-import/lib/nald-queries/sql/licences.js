'use strict';

const getLicence = `
  select l.*,
    to_date(nullif(l."ORIG_EFF_DATE", 'null'), 'DD/MM/YYYY') as start_date,
  least(
    to_date(nullif(l."EXPIRY_DATE", 'null'), 'DD/MM/YYYY'),
    to_date(nullif(l."REV_DATE", 'null'), 'DD/MM/YYYY'),
    to_date(nullif(l."LAPSED_DATE", 'null'), 'DD/MM/YYYY')
  ) as end_date
  from import."NALD_ABS_LICENCES" l
  where l."LIC_NO" = $1;
`;

const getCurrentVersion = `
  SELECT v.*, t.*
  FROM import."NALD_ABS_LIC_VERSIONS" v
    JOIN import."NALD_WA_LIC_TYPES" t
      ON v."WA_ALTY_CODE" = t."CODE"
    JOIN import."NALD_ABS_LICENCES" l
      ON v."AABL_ID" = l."ID"
      AND l."FGAC_REGION_CODE" = v."FGAC_REGION_CODE"
  WHERE "AABL_ID" = $1
  AND v."FGAC_REGION_CODE" = $2
  AND (
    0 = 0
    AND "EFF_END_DATE" = 'null'
    OR to_date( "EFF_END_DATE", 'DD/MM/YYYY' ) > now()
  )
  AND (
    0 = 0
    AND v."STATUS" = 'CURR'
    AND (
      l."EXPIRY_DATE" = 'null'
      OR to_date(l."EXPIRY_DATE", 'DD/MM/YYYY') > NOW()
    )
    AND (
      l."LAPSED_DATE" = 'null' OR to_date(l."LAPSED_DATE", 'DD/MM/YYYY') > NOW()
    )
    AND (
      l."REV_DATE" = 'null' OR to_date(l."REV_DATE", 'DD/MM/YYYY') > NOW()
    )
    AND (
      v."EFF_ST_DATE"='null' OR to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') <= NOW()
    )
  )
  ORDER BY "ISSUE_NO" DESC, "INCR_NO" DESC
  LIMIT 1;
`;

const getVersions = `
  select *
  from import."NALD_ABS_LIC_VERSIONS"
  where "AABL_ID" = $1 and "FGAC_REGION_CODE" = $2;
`;

const getCurrentFormats = `
  SELECT f.*
  FROM "import"."NALD_RET_VERSIONS" rv
    JOIN "import"."NALD_RET_FORMATS" f
      ON f."ARVN_AABL_ID" = $1
      AND f."FGAC_REGION_CODE" = $2
      AND rv."VERS_NO" = f."ARVN_VERS_NO"
  WHERE rv."AABL_ID" = $1
  AND rv."FGAC_REGION_CODE" = $2
  AND rv."STATUS" = 'CURR';
`;

exports.getLicence = getLicence;
exports.getCurrentVersion = getCurrentVersion;
exports.getVersions = getVersions;
exports.getCurrentFormats = getCurrentFormats;
