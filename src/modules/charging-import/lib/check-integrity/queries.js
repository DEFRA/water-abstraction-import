exports.sourceChargeVersions = `SELECT * FROM import."NALD_CHG_VERSIONS" v
ORDER BY v."FGAC_REGION_CODE"::integer, v."AABL_ID"::integer, v."VERS_NO"::integer`;

exports.targetChargeVersions = `SELECT * FROM water.charge_versions v
WHERE source='nald' ORDER BY v.region_code, v.external_id, v.version_number`;

exports.sourceChargeElements = `SELECT * FROM import."NALD_CHG_ELEMENTS" e
ORDER BY e."FGAC_REGION_CODE"::integer, e."ID"::integer`;

exports.targetChargeElements = `SELECT e.* FROM water.charge_elements e
JOIN water.charge_versions v ON v.charge_version_id=e.charge_version_id AND v.source='nald'
ORDER BY v.region_code, e.external_id`;

exports.sourceChargeAgreements = `SELECT * FROM import."NALD_CHG_AGRMNTS" a
ORDER BY a."FGAC_REGION_CODE"::integer, a."ACEL_ID"::integer, a."EFF_ST_DATE"::date, a."AFSA_CODE"`;

exports.targetChargeAgreements = `SELECT a.* FROM water.charge_agreements a
JOIN water.charge_elements e ON a.charge_element_id=e.charge_element_id
JOIN water.charge_versions v ON e.charge_version_id=v.charge_version_id AND v.source='nald'
ORDER BY v.region_code, e.external_id, a.start_date, a.agreement_code::varchar`;
