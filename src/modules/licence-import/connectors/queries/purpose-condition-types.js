const createPurposeConditionTypes = `
INSERT INTO water.licence_version_purpose_condition_types (
  code,
  subcode,
  description,
  subcode_description
  ) 
  SELECT "CODE", "SUBCODE", "DESCR", "SUBCODE_DESC" FROM import."NALD_LIC_COND_TYPES" 
  WHERE "AFFECTS_ABS" = 'Y' 
  ON CONFLICT (code, subcode)
  DO UPDATE SET
    description = excluded.description,
    subcode_description = excluded.subcode_description,
    date_updated = now();
`

module.exports = {
  createPurposeConditionTypes
}
