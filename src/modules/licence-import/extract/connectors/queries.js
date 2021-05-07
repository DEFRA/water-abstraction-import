exports.getLicence = `
  SELECT *
  FROM import."NALD_ABS_LICENCES" l
  WHERE l."LIC_NO"=$1;
`;

exports.getLicenceVersions = `
  SELECT *
  FROM import."NALD_ABS_LIC_VERSIONS" v
  WHERE v."FGAC_REGION_CODE"=$1
  AND v."AABL_ID"=$2
  AND v."STATUS"<>'DRAFT';
`;

exports.getLicencePurposes = `
  select purposes.*
  from import."NALD_ABS_LIC_VERSIONS" versions
    join import."NALD_ABS_LIC_PURPOSES" purposes
      on versions."AABL_ID" = purposes."AABV_AABL_ID"
      and versions."ISSUE_NO" = purposes."AABV_ISSUE_NO"
      and versions."INCR_NO" = purposes."AABV_INCR_NO"
      and versions."FGAC_REGION_CODE" = purposes."FGAC_REGION_CODE"
  where versions."FGAC_REGION_CODE" = $1
  and versions."AABL_ID" = $2;
`;

exports.getParty = `SELECT * FROM import."NALD_PARTIES" p
  WHERE p."FGAC_REGION_CODE"=$1
  AND p."ID" = $2`;

exports.getAddress = `SELECT * FROM import."NALD_ADDRESSES" a
  WHERE a."FGAC_REGION_CODE"=$1
  AND a."ID" = $2`;

exports.getAllAddresses = 'SELECT * FROM import."NALD_ADDRESSES"';

exports.getAllParties = 'SELECT "FGAC_REGION_CODE", "ID" FROM import."NALD_PARTIES"';

exports.getChargeVersions = `
  SELECT *
  FROM import."NALD_CHG_VERSIONS" cv
    JOIN import."NALD_IAS_INVOICE_ACCS" ia
      ON cv."AIIA_IAS_CUST_REF"=ia."IAS_CUST_REF"
        AND cv."FGAC_REGION_CODE"=ia."FGAC_REGION_CODE"
        AND cv."AIIA_ALHA_ACC_NO"=ia."ALHA_ACC_NO"
  WHERE cv."FGAC_REGION_CODE"=$1
    AND cv."AABL_ID"=$2 AND cv."STATUS"<>'DRAFT'
    AND ia."IAS_XFER_DATE"<>'null'
  ORDER BY cv."VERS_NO"::integer;
`;

exports.getSection130Agreements = `SELECT * FROM import."NALD_LH_AGRMNTS" ag
JOIN (
  SELECT DISTINCT cv."FGAC_REGION_CODE", cv."AIIA_ALHA_ACC_NO"
  FROM import."NALD_CHG_VERSIONS" cv
  WHERE cv."FGAC_REGION_CODE"=$1 AND cv."AABL_ID"=$2 AND cv."STATUS"<>'DRAFT'
) cv ON ag."FGAC_REGION_CODE"=cv."FGAC_REGION_CODE" AND ag."ALHA_ACC_NO"=cv."AIIA_ALHA_ACC_NO"
AND ag."AFSA_CODE" IN ('S127', 'S130S', 'S130T', 'S130U', 'S130W')
`;

exports.getInvoiceAccounts = `
select a."ACON_APAR_ID" AS licence_holder_party_id, p."NAME" AS licence_holder_party_name,
p2."NAME" AS invoice_account_party_name,
i.*
from import."NALD_LH_ACCS" a
join import."NALD_PARTIES" p on a."ACON_APAR_ID"=p."ID" and a."FGAC_REGION_CODE"=p."FGAC_REGION_CODE"
join import."NALD_IAS_INVOICE_ACCS" i
on
  a."ACC_NO"=i."ALHA_ACC_NO"
  and a."FGAC_REGION_CODE"=i."FGAC_REGION_CODE"
join import."NALD_PARTIES" p2 on i."ACON_APAR_ID"=p2."ID" AND i."FGAC_REGION_CODE"=p2."FGAC_REGION_CODE"
join (
  select distinct cv."AIIA_IAS_CUST_REF", cv."AIIA_ALHA_ACC_NO", cv."FGAC_REGION_CODE"
  from import."NALD_CHG_VERSIONS" cv
  where cv."STATUS"<>'DRAFT'
) cv
on
  i."IAS_CUST_REF"=cv."AIIA_IAS_CUST_REF"
  and i."FGAC_REGION_CODE"=cv."FGAC_REGION_CODE"
  and i."ALHA_ACC_NO"=cv."AIIA_ALHA_ACC_NO"
where
  i."IAS_XFER_DATE"<>'null'
  and a."FGAC_REGION_CODE"=$1
  and a."ACON_APAR_ID"=$2
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

exports.getAllLicenceNumbers = `
  SELECT l."LIC_NO"
  FROM import."NALD_ABS_LICENCES" l;
`;

exports.getLicenceRoles = `
select * from import."NALD_LIC_ROLES" r
where r."FGAC_REGION_CODE"=$1 and r."AABL_ID"=$2
order by to_date(r."EFF_ST_DATE", 'DD/MM/YYYY')
`;

exports.getPartyLicenceRoles = `
select * from import."NALD_LIC_ROLES" r
  where r."FGAC_REGION_CODE"=$1 and r."ACON_APAR_ID"=$2
`;
