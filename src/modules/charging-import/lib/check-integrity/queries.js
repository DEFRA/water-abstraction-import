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

exports.sourceChargeAgreements = `
  SELECT *
  FROM import."NALD_CHG_AGRMNTS" a
  WHERE a."AFSA_CODE" NOT IN ('S127', 'S130S', 'S130T', 'S130U', 'S130W')
  ORDER BY a."FGAC_REGION_CODE"::integer, a."ACEL_ID"::integer, to_date(a."EFF_ST_DATE", 'DD/MM/YYYY'), a."AFSA_CODE";`;

exports.targetChargeAgreements = `
  SELECT a.*
  FROM water.charge_agreements a
    JOIN water.charge_elements e
      ON a.charge_element_id=e.charge_element_id
    JOIN water.charge_versions v
      ON e.charge_version_id=v.charge_version_id AND v.source='nald'
  ORDER BY v.region_code, e.external_id, a.start_date, a.agreement_code::varchar;`;
