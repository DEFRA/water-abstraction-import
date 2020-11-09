exports.sourceChargeVersions = `
  SELECT *
  FROM import."NALD_CHG_VERSIONS" v
  ORDER BY concat_ws(':', v."FGAC_REGION_CODE", v."AABL_ID", v."VERS_NO");`;

exports.targetChargeVersions = `
  SELECT *
  FROM water.charge_versions v
  WHERE source='nald'
  ORDER BY v.external_id`;

exports.sourceChargeElements = `
  SELECT *
  FROM import."NALD_CHG_ELEMENTS" e
  ORDER BY concat_ws(':', e."FGAC_REGION_CODE", e."ID");`;

exports.targetChargeElements = `
  SELECT e.*
  FROM water.charge_elements e
    JOIN water.charge_versions v
      ON v.charge_version_id=e.charge_version_id AND v.source='nald'
  ORDER BY e.external_id`;
