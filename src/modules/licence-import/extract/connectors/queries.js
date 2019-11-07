exports.getLicence = `SELECT * FROM import."NALD_ABS_LICENCES" l WHERE l."LIC_NO"=$1`;

exports.getLicenceVersions = `SELECT * FROM import."NALD_ABS_LIC_VERSIONS" v
  WHERE v."FGAC_REGION_CODE"=$1
  AND v."AABL_ID"=$2
  AND v."STATUS"<>'DRAFT'`;

exports.getParty = `SELECT * FROM import."NALD_PARTIES" p 
  WHERE p."FGAC_REGION_CODE"=$1 
  AND p."ID" = $2`;

exports.getAddress = `SELECT * FROM import."NALD_ADDRESSES" a
  WHERE a."FGAC_REGION_CODE"=$1 
  AND a."ID" = $2`;

exports.getAllAddresses = `SELECT * FROM import."NALD_ADDRESSES"`;

exports.getAllParties = `SELECT * FROM import."NALD_PARTIES"`;

exports.getChargeVersions = `SELECT * FROM import."NALD_CHG_VERSIONS" cv
  JOIN import."NALD_IAS_INVOICE_ACCS" ia 
  ON cv."AIIA_IAS_CUST_REF"=ia."IAS_CUST_REF" AND cv."FGAC_REGION_CODE"=ia."FGAC_REGION_CODE" AND cv."AIIA_ALHA_ACC_NO"=ia."ALHA_ACC_NO"
  WHERE cv."FGAC_REGION_CODE"=$1 AND cv."AABL_ID"=$2 
  ORDER BY cv."VERS_NO"::integer`;

exports.getTwoPartTariffAgreements = `SELECT a.* FROM import."NALD_CHG_VERSIONS" cv
JOIN import."NALD_CHG_ELEMENTS" e ON cv."FGAC_REGION_CODE"=e."FGAC_REGION_CODE" AND cv."VERS_NO"=e."ACVR_VERS_NO" AND cv."AABL_ID"=e."ACVR_AABL_ID" 
JOIN import."NALD_CHG_AGRMNTS" a ON e."FGAC_REGION_CODE"=a."FGAC_REGION_CODE" AND e."ID"=a."ACEL_ID"
WHERE cv."FGAC_REGION_CODE"=$1 AND cv."AABL_ID"=$2 AND a."AFSA_CODE"='S127'
ORDER BY cv."VERS_NO"::integer`;

exports.getSection130Agreements = `SELECT * FROM import."NALD_LH_AGRMNTS" ag
JOIN (
  SELECT DISTINCT cv."FGAC_REGION_CODE", cv."AIIA_ALHA_ACC_NO" 
  FROM import."NALD_CHG_VERSIONS" cv 
  WHERE cv."FGAC_REGION_CODE"=$1 AND cv."AABL_ID"=$2 AND cv."STATUS"<>'DRAFT' 
) cv ON ag."FGAC_REGION_CODE"=cv."FGAC_REGION_CODE" AND ag."ALHA_ACC_NO"=cv."AIIA_ALHA_ACC_NO"
AND ag."AFSA_CODE" IN ('S127', 'S130S', 'S130T', 'S130U', 'S130W')
`;

exports.getInvoiceAccounts = `SELECT i.* FROM import."NALD_IAS_INVOICE_ACCS" i 
JOIN (
  SELECT DISTINCT cv."AIIA_IAS_CUST_REF", cv."AIIA_ALHA_ACC_NO", cv."FGAC_REGION_CODE" 
  FROM import."NALD_CHG_VERSIONS" cv 
  WHERE cv."STATUS"<>'DRAFT'
) cv ON i."IAS_CUST_REF"=cv."AIIA_IAS_CUST_REF" AND i."FGAC_REGION_CODE"=cv."FGAC_REGION_CODE" AND i."ALHA_ACC_NO"=cv."AIIA_ALHA_ACC_NO"
WHERE i."FGAC_REGION_CODE"=$1 AND i."ACON_APAR_ID"=$2 AND i."IAS_XFER_DATE"<>'null' 
`;

exports.getPartyLicenceVersions = `SELECT lv.*, l."REV_DATE", l."LAPSED_DATE", l."EXPIRY_DATE" FROM import."NALD_ABS_LIC_VERSIONS" lv 
JOIN import."NALD_ABS_LICENCES" l ON lv."AABL_ID"=l."ID" AND lv."FGAC_REGION_CODE"=l."FGAC_REGION_CODE"
WHERE lv."FGAC_REGION_CODE"=$1 AND lv."ACON_APAR_ID"=$2
AND lv."STATUS"<>'DRAFT'`;

exports.getParties = `SELECT * FROM import."NALD_PARTIES" p 
WHERE p."FGAC_REGION_CODE"=$1 
AND p."ID" =  any (string_to_array($2, ',')::text[])`;

exports.getAddresses = `SELECT * FROM import."NALD_ADDRESSES" a
WHERE a."FGAC_REGION_CODE"=$1 
AND a."ID" =  any (string_to_array($2, ',')::text[])`;

exports.getAllLicenceNumbers = `SELECT "LIC_NO" FROM import."NALD_ABS_LICENCES"`;
