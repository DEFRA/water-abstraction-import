const getLicence = `
  SELECT *
  FROM import."NALD_ABS_LICENCES" l
  WHERE l."LIC_NO"=$1;
`

const getLicenceVersions = `
  SELECT *
  FROM import."NALD_ABS_LIC_VERSIONS" v
  WHERE v."FGAC_REGION_CODE"=$1
  AND v."AABL_ID"=$2
  AND v."STATUS"<>'DRAFT';
`

const getLicencePurposes = `
  select purposes.*
  from import."NALD_ABS_LIC_VERSIONS" versions
    join import."NALD_ABS_LIC_PURPOSES" purposes
      on versions."AABL_ID" = purposes."AABV_AABL_ID"
      and versions."ISSUE_NO" = purposes."AABV_ISSUE_NO"
      and versions."INCR_NO" = purposes."AABV_INCR_NO"
      and versions."FGAC_REGION_CODE" = purposes."FGAC_REGION_CODE"
  where versions."FGAC_REGION_CODE" = $1
  and versions."AABL_ID" = $2;
`

const getPurposeConditions = `
select conditions.*
from import."NALD_ABS_LIC_VERSIONS" versions
  join import."NALD_ABS_LIC_PURPOSES" purposes
    on versions."AABL_ID" = purposes."AABV_AABL_ID"
    and versions."ISSUE_NO" = purposes."AABV_ISSUE_NO"
    and versions."INCR_NO" = purposes."AABV_INCR_NO"
    and versions."FGAC_REGION_CODE" = purposes."FGAC_REGION_CODE"
  join import."NALD_LIC_CONDITIONS" conditions
  on purposes."FGAC_REGION_CODE" = conditions."FGAC_REGION_CODE"
  and purposes."ID" = conditions."AABP_ID"
where versions."FGAC_REGION_CODE" = $1
and versions."AABL_ID" = $2
`

const getParty = `SELECT * FROM import."NALD_PARTIES" p
  WHERE p."FGAC_REGION_CODE"=$1
  AND p."ID" = $2`

const getAddress = `SELECT * FROM import."NALD_ADDRESSES" a
  WHERE a."FGAC_REGION_CODE"=$1
  AND a."ID" = $2`

const getAllAddresses = 'SELECT * FROM import."NALD_ADDRESSES"'

const getAllParties = 'SELECT "FGAC_REGION_CODE", "ID" FROM import."NALD_PARTIES"'

const getChargeVersions = `
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
`

const getTwoPartTariffAgreements = `
SELECT 
  a.*, 
  cv."EFF_END_DATE" as charge_version_end_date, 
  cv."EFF_ST_DATE" as charge_version_start_date,
  cv."VERS_NO" as version_number
FROM import."NALD_CHG_VERSIONS" cv
JOIN import."NALD_CHG_ELEMENTS" e ON cv."FGAC_REGION_CODE"=e."FGAC_REGION_CODE" AND cv."VERS_NO"=e."ACVR_VERS_NO" AND cv."AABL_ID"=e."ACVR_AABL_ID"
JOIN import."NALD_CHG_AGRMNTS" a ON e."FGAC_REGION_CODE"=a."FGAC_REGION_CODE" AND e."ID"=a."ACEL_ID"
WHERE 
  cv."FGAC_REGION_CODE"=$1 
  -- Exclude charge versions that have been replaced. We know a CV is replaced because it will have the same start and end date
  AND cv."EFF_END_DATE" <> cv."EFF_ST_DATE" 
  AND cv."AABL_ID"=$2 
  AND a."AFSA_CODE"='S127'
  AND concat_ws(':', cv."FGAC_REGION_CODE", cv."AABL_ID", cv."VERS_NO") in (
    -- Finds valid charge versions to select from.  
    -- Draft charge versions are omitted.
    -- Where multiple charge versions begin on the same date, 
    -- pick the one with the greatest version number.
    select concat_ws(':', 
      ncv."FGAC_REGION_CODE", 
      ncv."AABL_ID", 
      max(ncv."VERS_NO"::integer)::varchar
    ) as id
    from import."NALD_CHG_VERSIONS" ncv
    where ncv."STATUS"<>'DRAFT'
    group by ncv."FGAC_REGION_CODE", ncv."AABL_ID", ncv."EFF_ST_DATE"
  )
ORDER BY cv."VERS_NO"::integer;
`

const getSection130Agreements = `SELECT * FROM import."NALD_LH_AGRMNTS" ag
JOIN (
  SELECT DISTINCT cv."FGAC_REGION_CODE", cv."AIIA_ALHA_ACC_NO"
  FROM import."NALD_CHG_VERSIONS" cv
  WHERE cv."FGAC_REGION_CODE"=$1 AND cv."AABL_ID"=$2 AND cv."STATUS"<>'DRAFT'
) cv ON ag."FGAC_REGION_CODE"=cv."FGAC_REGION_CODE" AND ag."ALHA_ACC_NO"=cv."AIIA_ALHA_ACC_NO"
AND ag."AFSA_CODE" IN ('S127', 'S130S', 'S130T', 'S130U', 'S130W')
`

const getInvoiceAccounts = `
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
`

const getPartyLicenceVersions = `SELECT lv.*, l."REV_DATE", l."LAPSED_DATE", l."EXPIRY_DATE" FROM import."NALD_ABS_LIC_VERSIONS" lv
JOIN import."NALD_ABS_LICENCES" l ON lv."AABL_ID"=l."ID" AND lv."FGAC_REGION_CODE"=l."FGAC_REGION_CODE"
WHERE lv."FGAC_REGION_CODE"=$1 AND lv."ACON_APAR_ID"=$2
AND lv."STATUS"<>'DRAFT'`

const getParties = `SELECT * FROM import."NALD_PARTIES" p
WHERE p."FGAC_REGION_CODE"=$1
AND p."ID" =  any (string_to_array($2, ',')::text[])`

const getAddresses = `SELECT * FROM import."NALD_ADDRESSES" a
WHERE a."FGAC_REGION_CODE"=$1
AND a."ID" =  any (string_to_array($2, ',')::text[])`

const getAllLicenceNumbers = `
  SELECT l."LIC_NO"
  FROM import."NALD_ABS_LICENCES" l;
`

const getLicenceRoles = `
select * from import."NALD_LIC_ROLES" r
where r."FGAC_REGION_CODE"=$1 and r."AABL_ID"=$2
order by to_date(r."EFF_ST_DATE", 'DD/MM/YYYY')
`

const getPartyLicenceRoles = `
select * from import."NALD_LIC_ROLES" r
  where r."FGAC_REGION_CODE"=$1 and r."ACON_APAR_ID"=$2
`

module.exports = {
  getLicence,
  getLicenceVersions,
  getLicencePurposes,
  getPurposeConditions,
  getParty,
  getAddress,
  getAllAddresses,
  getAllParties,
  getChargeVersions,
  getTwoPartTariffAgreements,
  getSection130Agreements,
  getInvoiceAccounts,
  getPartyLicenceVersions,
  getParties,
  getAddresses,
  getAllLicenceNumbers,
  getLicenceRoles,
  getPartyLicenceRoles
}
