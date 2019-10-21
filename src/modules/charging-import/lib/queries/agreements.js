/**
 * Gets account-level agreements - currently only Section 130
 */
const getAccountAgreements = `
SELECT l."LIC_NO", ag."AFSA_CODE",

GREATEST(
  to_date(v."EFF_ST_DATE", 'DD/MM/YYYY'),
  to_date(ag."EFF_ST_DATE", 'DD/MM/YYYY')
) AS start_date,
LEAST(
  to_date(NULLIF(v."EFF_END_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(l."EXPIRY_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(l."LAPSED_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(l."REV_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(ag."EFF_END_DATE", 'null'), 'DD/MM/YYYY')
) AS end_date

FROM import."NALD_CHG_VERSIONS" v
JOIN import."NALD_ABS_LICENCES" l ON v."AABL_ID"=l."ID" AND v."FGAC_REGION_CODE"=l."FGAC_REGION_CODE"
JOIN import."NALD_LH_ACCS" ac ON v."AIIA_ALHA_ACC_NO"=ac."ACC_NO" AND v."FGAC_REGION_CODE"=ac."FGAC_REGION_CODE"
LEFT JOIN import."NALD_LH_AGRMNTS" ag ON ac."ACC_NO"=ag."ALHA_ACC_NO" AND ac."FGAC_REGION_CODE"=ag."FGAC_REGION_CODE"
WHERE ag."AFSA_CODE" IN ('S130U', 'S130T')

ORDER BY l."LIC_NO", to_date(v."EFF_ST_DATE", 'DD/MM/YYYY')
`;

const insertLicenceAgreement = `
INSERT INTO water.licence_agreements (licence_ref, financial_agreement_type_id, start_date, end_date, date_created, date_updated)
  VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (licence_ref, financial_agreement_type_id, start_date) DO UPDATE 
  SET date_updated=EXCLUDED.date_updated
`;

const getTwoPartTariffAgreements = `
SELECT a."AFSA_CODE", l."LIC_NO", a."EFF_ST_DATE",

GREATEST(
  to_date(v."EFF_ST_DATE", 'DD/MM/YYYY'),
  to_date(a."EFF_ST_DATE", 'DD/MM/YYYY')
) AS start_date,
LEAST(
  to_date(NULLIF(v."EFF_END_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(a."EFF_END_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(l."EXPIRY_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(l."LAPSED_DATE", 'null'), 'DD/MM/YYYY'),
  to_date(NULLIF(l."REV_DATE", 'null'), 'DD/MM/YYYY')
) AS end_date


FROM import."NALD_CHG_AGRMNTS" a 
JOIN import."NALD_CHG_ELEMENTS" e ON a."ACEL_ID"=e."ID" AND a."FGAC_REGION_CODE"=e."FGAC_REGION_CODE"
JOIN import."NALD_CHG_VERSIONS" v ON e."ACVR_AABL_ID"=v."AABL_ID" AND e."ACVR_VERS_NO"=v."VERS_NO" AND e."FGAC_REGION_CODE"=v."FGAC_REGION_CODE"
JOIN import."NALD_ABS_LICENCES" l ON v."AABL_ID"=l."ID" AND v."FGAC_REGION_CODE"=l."FGAC_REGION_CODE"


WHERE a."AFSA_CODE"='S127'
ORDER BY l."LIC_NO",  GREATEST(
  to_date(v."EFF_ST_DATE", 'DD/MM/YYYY'),
  to_date(a."EFF_ST_DATE", 'DD/MM/YYYY')
)
`;

exports.getAccountAgreements = getAccountAgreements;
exports.insertLicenceAgreement = insertLicenceAgreement;
exports.getTwoPartTariffAgreements = getTwoPartTariffAgreements;
