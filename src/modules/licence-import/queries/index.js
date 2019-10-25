exports.getLicence = `SELECT * FROM import."NALD_ABS_LICENCES" l WHERE l."LIC_NO"=$1`;

exports.getLicenceVersions = `SELECT * FROM import."NALD_ABS_LIC_VERSIONS" v
  WHERE v."FGAC_REGION_CODE"=$1
  AND v."AABL_ID"=$2`;

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
