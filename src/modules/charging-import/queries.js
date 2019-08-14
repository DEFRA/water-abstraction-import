const { pool } = require('../../lib/connectors/db');

const createChargeVersionGuids = () => {
  const query = `INSERT INTO water_import.charge_versions
  (licence_id, version, region_code)
SELECT
v."AABL_ID"::integer,
v."VERS_NO"::integer,
v."FGAC_REGION_CODE"::integer
FROM import."NALD_CHG_VERSIONS" v

ON CONFLICT DO NOTHING;`;
  return pool.query(query);
};

const createChargeElementGuids = () => {
  const query = `INSERT INTO water_import.charge_elements
  (element_id, licence_id, version, region_code)
SELECT
e."ID"::integer,
e."ACVR_AABL_ID"::integer,
e."ACVR_VERS_NO"::integer,
e."FGAC_REGION_CODE"::integer
FROM import."NALD_CHG_ELEMENTS" e
ON CONFLICT DO NOTHING`;
  return pool.query(query);
};

const createChargeAgreementGuids = () => {
  const query = `
INSERT INTO water_import.charge_agreements
(element_id, afsa_code, start_date, region_code)
SELECT a."ACEL_ID"::integer,
a."AFSA_CODE",
a."EFF_ST_DATE"::date,
a."FGAC_REGION_CODE"::integer
FROM import."NALD_CHG_AGRMNTS" a
ON CONFLICT DO NOTHING`;
  return pool.query(query);
};

exports.createChargeVersionGuids = createChargeVersionGuids;
exports.createChargeElementGuids = createChargeElementGuids;
exports.createChargeAgreementGuids = createChargeAgreementGuids;
