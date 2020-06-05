'use strict';

const getFormats = `
  SELECT f.*,
    v.*,
    l."AREP_AREA_CODE",
    l."EXPIRY_DATE" as "LICENCE_EXPIRY_DATE",
    l."REV_DATE" as "LICENCE_REVOKED_DATE",
    l."LAPSED_DATE" as "LICENCE_LAPSED_DATE"
  FROM "import"."NALD_ABS_LICENCES" l
    LEFT JOIN "import"."NALD_RET_FORMATS" f
      ON l."ID"=f."ARVN_AABL_ID"
      AND l."FGAC_REGION_CODE"=f."FGAC_REGION_CODE"
    JOIN "import"."NALD_RET_VERSIONS" v
      ON f."ARVN_VERS_NO"=v."VERS_NO"
      AND f."ARVN_AABL_ID"=v."AABL_ID"
      AND f."FGAC_REGION_CODE"=v."FGAC_REGION_CODE"
  WHERE l."LIC_NO"=$1
  ORDER BY to_date(v."EFF_ST_DATE", 'DD/MM/YYYY');
`;

const getFormatPurposes = `
  SELECT p.*,
    p1."DESCR" AS primary_purpose,
    p2."DESCR" AS secondary_purpose,
    p3."DESCR" AS tertiary_purpose
  FROM "import"."NALD_RET_FMT_PURPOSES" p
    LEFT JOIN "import"."NALD_PURP_PRIMS" p1
      ON p."APUR_APPR_CODE" = p1."CODE"
    LEFT JOIN "import"."NALD_PURP_SECS" p2
      ON p."APUR_APSE_CODE" = p2."CODE"
    LEFT JOIN "import"."NALD_PURP_USES" p3
      ON p."APUR_APUS_CODE" = p3."CODE"
  WHERE p."ARTY_ID" = $1 AND p."FGAC_REGION_CODE" = $2;
`;

const getFormatPoints = `
  SELECT p.*
  FROM "import"."NALD_RET_FMT_POINTS" fp
    LEFT JOIN "import"."NALD_POINTS" p
      ON fp."AAIP_ID" = p."ID" AND fp."FGAC_REGION_CODE" = p."FGAC_REGION_CODE"
  WHERE fp."ARTY_ID" = $1
  AND fp."FGAC_REGION_CODE" = $2;
`;

const getLogs = `
  SELECT l.*
  FROM "import"."NALD_RET_FORM_LOGS" l
  WHERE l."ARTY_ID" = $1 AND l."FGAC_REGION_CODE" = $2
  ORDER BY to_date(l."DATE_FROM", 'DD/MM/YYYY');
`;

const getLines = `
  SELECT l.*
  FROM "import"."NALD_RET_LINES" l
  WHERE l."ARFL_ARTY_ID" = $1
  AND l."FGAC_REGION_CODE" = $2
  AND to_date("RET_DATE", 'YYYYMMDDHH24MISS')>=to_date($3, 'YYYY-MM-DD')
  AND to_date("RET_DATE", 'YYYYMMDDHH24MISS')<=to_date($4, 'YYYY-MM-DD')
  ORDER BY "RET_DATE";
`;

const getLogLines = `
  SELECT l.*
  FROM "import"."NALD_RET_LINES" l
  WHERE l."ARFL_ARTY_ID" = $1
  AND l."FGAC_REGION_CODE" = $2
  AND "ARFL_DATE_FROM" = $3
  ORDER BY "RET_DATE";
`;

const isNilReturn = `
  SELECT SUM(
    CASE
      WHEN l."RET_QTY"='' THEN 0
      ELSE l."RET_QTY"::float
    END
  ) AS total_qty
  FROM "import"."NALD_RET_LINES" l
  WHERE l."ARFL_ARTY_ID"=$1
  AND l."FGAC_REGION_CODE"=$2
  AND to_date("RET_DATE", 'YYYYMMDDHH24MISS')>=to_date($3, 'YYYY-MM-DD')
  AND to_date("RET_DATE", 'YYYYMMDDHH24MISS')<=to_date($4, 'YYYY-MM-DD');
`;

const getSplitDate = `
  SELECT l."ID", v."ISSUE_NO", v."INCR_NO", v."EFF_ST_DATE", m.*
  FROM "import"."NALD_ABS_LICENCES" l
    JOIN "import"."NALD_ABS_LIC_VERSIONS" v
      ON l."ID"=v."AABL_ID" AND l."FGAC_REGION_CODE"=v."FGAC_REGION_CODE"
    JOIN "import"."NALD_MOD_LOGS" m
      ON l."ID"=m."AABL_ID"
      AND l."FGAC_REGION_CODE" = m."FGAC_REGION_CODE"
      AND v."ISSUE_NO" = m."AABV_ISSUE_NO"
      AND v."INCR_NO" = m."AABV_INCR_NO"
  WHERE l."LIC_NO" = $1
  AND m."AMRE_CODE" = 'SUCC'
  ORDER BY to_date(v."EFF_ST_DATE", 'DD/MM/YYYY') DESC
  LIMIT 1;
`;

const getReturnVersionReason = `
  SELECT l."AMRE_CODE"
  FROM import."NALD_RET_VERSIONS" rv
    JOIN import."NALD_MOD_LOGS" l
      ON l."ARVN_AABL_ID" = rv."AABL_ID"
      AND l."ARVN_VERS_NO" = rv."VERS_NO"
      AND l."FGAC_REGION_CODE" = rv."FGAC_REGION_CODE"
      AND l."AMRE_AMRE_TYPE" = 'RET'
  WHERE rv."AABL_ID" = $1
  AND rv."VERS_NO" = $2
  AND rv."FGAC_REGION_CODE" = $3;
`;

exports.getFormats = getFormats;
exports.getFormatPurposes = getFormatPurposes;
exports.getFormatPoints = getFormatPoints;
exports.getLogs = getLogs;
exports.getLines = getLines;
exports.getLogLines = getLogLines;
exports.isNilReturn = isNilReturn;
exports.getSplitDate = getSplitDate;
exports.getReturnVersionReason = getReturnVersionReason;
