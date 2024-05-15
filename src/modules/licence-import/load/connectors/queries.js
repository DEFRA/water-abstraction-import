const createDocument = `
  INSERT INTO crm_v2.documents (regime, document_type, document_ref, start_date, end_date, external_id, date_created, date_updated, date_deleted)
  VALUES ('water', 'abstraction_licence', $1, $2, $3, $4, NOW(), NOW(), null)
  ON CONFLICT (regime, document_type, document_ref)
  DO UPDATE SET
    start_date=EXCLUDED.start_date,
    end_date=EXCLUDED.end_date,
    external_id=EXCLUDED.external_id,
    date_updated=EXCLUDED.date_updated,
    date_deleted=EXCLUDED.date_deleted;`

const createDocumentRole = `INSERT INTO crm_v2.document_roles (document_id, role_id, company_id, contact_id, address_id, start_date, end_date, date_created, date_updated, invoice_account_id)
SELECT d.document_id, r.role_id, c.company_id, co.contact_id, a.address_id, $7, $8, NOW(), NOW(), ia.invoice_account_id
  FROM crm_v2.documents d
  JOIN crm_v2.roles r ON r.name=$2
  LEFT JOIN crm_v2.companies c ON c.external_id=$3
  LEFT JOIN crm_v2.contacts co ON co.external_id=$4
  LEFT JOIN crm_v2.addresses a ON a.external_id=$5
  LEFT JOIN crm_v2.invoice_accounts ia ON ia.invoice_account_number=$6
  WHERE d.document_ref=$1
ON CONFLICT (document_id, role_id, start_date)
  DO UPDATE SET
    company_id=EXCLUDED.company_id,
    contact_id=EXCLUDED.contact_id,
    address_id=EXCLUDED.address_id,
    invoice_account_id=EXCLUDED.invoice_account_id,
    end_date=EXCLUDED.end_date,
    date_updated=EXCLUDED.date_updated;`

const createCompany = `INSERT INTO crm_v2.companies (name, type, external_id, date_created, date_updated, current_hash)
VALUES ($1, $2, $3, NOW(), NOW(), md5(CONCAT($1::varchar, $2::varchar)::varchar)) ON CONFLICT (external_id) DO UPDATE SET name=EXCLUDED.name,
date_updated=EXCLUDED.date_updated, type=EXCLUDED.type, last_hash=EXCLUDED.current_hash, current_hash=md5(CONCAT(EXCLUDED.name::varchar,EXCLUDED.type::varchar)::varchar);`

const createAddress = `INSERT INTO crm_v2.addresses (address_1, address_2, address_3, address_4,
town, county, postcode, country, external_id, data_source, date_created, date_updated, current_hash)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'nald', NOW(), NOW(), md5(
CONCAT(
    $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar
  )::varchar
)) ON CONFLICT (external_id) DO UPDATE SET
address_1=EXCLUDED.address_1,
address_2=EXCLUDED.address_2,
address_3=EXCLUDED.address_3,
address_4=EXCLUDED.address_4,
town=EXCLUDED.town,
county=EXCLUDED.county,
postcode=EXCLUDED.postcode,
country=EXCLUDED.country,
last_hash=EXCLUDED.current_hash,
current_hash=md5(CONCAT(
EXCLUDED.address_1::varchar,
EXCLUDED.address_2::varchar,
EXCLUDED.address_3::varchar,
EXCLUDED.address_4::varchar,
EXCLUDED.town::varchar,
EXCLUDED.county::varchar,
EXCLUDED.postcode::varchar
)::varchar),
date_updated=EXCLUDED.date_updated;`

const createContact = `INSERT INTO crm_v2.contacts (salutation, initials, first_name, last_name, external_id, data_source, date_created, date_updated, current_hash)
VALUES ($1, $2, $3, $4, $5, 'nald', NOW(), NOW(), md5(CONCAT($1::varchar,$3::varchar,$4::varchar)::varchar)) ON CONFLICT (external_id) DO UPDATE SET
  salutation=EXCLUDED.salutation,
  initials=EXCLUDED.initials,
  first_name=EXCLUDED.first_name,
  last_name=EXCLUDED.last_name,
  external_id=EXCLUDED.external_id,
  date_updated=EXCLUDED.date_updated,
  last_hash=EXCLUDED.current_hash,
  current_hash=md5(CONCAT(
  EXCLUDED.salutation::varchar,
  EXCLUDED.first_name::varchar,
  EXCLUDED.last_name::varchar
  )::varchar);`

const createInvoiceAccount = `INSERT INTO crm_v2.invoice_accounts (company_id, invoice_account_number, start_date, end_date, date_created, date_updated)
SELECT company_id, $1, $2, $3, NOW(), NOW() FROM crm_v2.companies WHERE external_id=$4
ON CONFLICT (invoice_account_number) DO UPDATE SET
  company_id=EXCLUDED.company_id,
  start_date=EXCLUDED.start_date,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated;`

const createInvoiceAccountAddress = `INSERT INTO crm_v2.invoice_account_addresses (invoice_account_id, address_id, agent_company_id, start_date, end_date, date_updated, date_created)
SELECT ia.invoice_account_id, a.address_id, c.company_id, $3, $4, NOW(), NOW()
FROM crm_v2.invoice_accounts ia
JOIN crm_v2.addresses a ON a.external_id=$2
LEFT JOIN crm_v2.companies c ON c.external_id=$5
WHERE ia.invoice_account_number=$1 ON CONFLICT (invoice_account_id, start_date) DO UPDATE SET
  address_id=EXCLUDED.address_id,
  date_updated=EXCLUDED.date_updated,
  agent_company_id=EXCLUDED.agent_company_id;`

const createCompanyContact = `INSERT INTO crm_v2.company_contacts (company_id, contact_id, role_id, start_date, end_date, is_default, date_created, date_updated)
SELECT c.company_id, o.contact_id, r.role_id, $4, $5, true, NOW(), NOW()
FROM crm_v2.companies c
JOIN crm_v2.contacts o ON o.external_id=$2
JOIN crm_v2.roles r ON r.name=$3
WHERE c.external_id=$1 ON CONFLICT (company_id, contact_id, role_id, start_date) DO UPDATE SET
  contact_id=EXCLUDED.contact_id,
  is_default=EXCLUDED.is_default,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated;`

const createCompanyAddress = `INSERT INTO crm_v2.company_addresses (company_id, address_id, role_id, start_date, end_date, is_default, date_created, date_updated)
SELECT c.company_id, a.address_id, r.role_id, $4, $5, true, NOW(), NOW()
FROM crm_v2.companies c
JOIN crm_v2.addresses a ON a.external_id=$2
JOIN crm_v2.roles r ON r.name=$3
WHERE c.external_id=$1
ON CONFLICT (company_id, address_id, role_id) DO UPDATE SET
  address_id=EXCLUDED.address_id,
  is_default=EXCLUDED.is_default,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated`

const createAgreement = `insert into water.licence_agreements (licence_ref, financial_agreement_type_id, start_date, end_date, date_created, date_updated, source)
  select $1, t.financial_agreement_type_id, $3, $4, NOW(), NOW(), 'nald'
    from water.financial_agreement_types t
    where t.financial_agreement_code=$2 on conflict (licence_ref, financial_agreement_type_id, start_date) WHERE date_deleted is null
    do update set end_date=EXCLUDED.end_date, date_updated=EXCLUDED.date_updated, source=EXCLUDED.source;`

const createLicence = `insert into water.licences (region_id, licence_ref, is_water_undertaker, regions, start_date, expired_date, lapsed_date, revoked_date)
  values (
    (select region_id from water.regions where nald_region_id = $1),
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8
  ) on conflict (licence_ref) do update set
    is_water_undertaker=excluded.is_water_undertaker,
    regions=excluded.regions,
    start_date=excluded.start_date,
    expired_date=excluded.expired_date,
    lapsed_date=excluded.lapsed_date,
    revoked_date=excluded.revoked_date,
    date_updated=now()
  returning licence_id;`

const createLicenceVersion = `insert into water.licence_versions (
    licence_id,
    issue,
    increment,
    status,
    start_date,
    end_date,
    external_id,
    date_created,
    date_updated
  ) values ($1, $2, $3, $4, $5, $6, $7, now(), now()) on conflict (external_id) do update set
    licence_id = excluded.licence_id,
    status = excluded.status,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    date_updated = now()
  returning licence_version_id;`

const createLicenceVersionPurpose = `insert into water.licence_version_purposes (
    licence_version_id,
    purpose_primary_id,
    purpose_secondary_id,
    purpose_use_id,
    abstraction_period_start_day,
    abstraction_period_start_month,
    abstraction_period_end_day,
    abstraction_period_end_month,
    time_limited_start_date,
    time_limited_end_date,
    notes,
    instant_quantity,
    hourly_quantity,
    daily_quantity,
    annual_quantity,
    external_id,
    date_created,
    date_updated
  ) values (
    $1,
    (select purpose_primary_id from water.purposes_primary where legacy_id = $2),
    (select purpose_secondary_id from water.purposes_secondary where legacy_id = $3),
    (select purpose_use_id from water.purposes_uses where legacy_id = $4),
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12,
    $13,
    $14,
    $15,
    $16,
    now(),
    now()
  ) on conflict (external_id) do update set
    purpose_primary_id = excluded.purpose_primary_id,
    purpose_secondary_id = excluded.purpose_secondary_id,
    purpose_use_id = excluded.purpose_use_id,
    abstraction_period_start_day = excluded.abstraction_period_start_day,
    abstraction_period_start_month = excluded.abstraction_period_start_month,
    abstraction_period_end_day = excluded.abstraction_period_end_day,
    abstraction_period_end_month = excluded.abstraction_period_end_month,
    time_limited_start_date = excluded.time_limited_start_date,
    time_limited_end_date = excluded.time_limited_end_date,
    notes = excluded.notes,
    instant_quantity = excluded.instant_quantity,
    hourly_quantity = excluded.hourly_quantity,
    daily_quantity = excluded.daily_quantity,
    annual_quantity = excluded.annual_quantity,
    date_updated = now()
    returning licence_version_purpose_id;`

const getLicenceByRef = 'SELECT * FROM water.licences WHERE licence_ref = $1'

// Only update the appropriate scheme's flag depending on what the licence is linked to; if both flag both, just got
// charge versions for one scheme then flag only it, else has no charge versions then do not flag at all.
// This updates the query to handle new SROC billing plus fixes an old problem of licences with no charge versions
// were getting flagged (with no charge versions they can't be billed and the flag then cleared).
//
// Also, we use the date rather than the scheme column because we have found examples of charge versions with start
// dates greater than 2022-04-01 (when SROC replaced ALCS) where the scheme is set to 'alcs'.
const flagLicenceForSupplementaryBilling = `
  UPDATE water.licences l
  SET include_in_supplementary_billing = CASE
    WHEN EXISTS (
      SELECT 1
      FROM water.charge_versions cv
      WHERE cv.licence_id = l.licence_id
        AND cv.start_date < '2022-04-01'::Date
    ) THEN 'yes'
    ELSE include_in_supplementary_billing
  END,
  include_in_sroc_supplementary_billing = CASE
    WHEN EXISTS (
      SELECT 1
      FROM water.charge_versions cv
      WHERE cv.licence_id = l.licence_id
        AND cv.start_date >= '2022-04-01'::Date
    ) THEN TRUE
    ELSE include_in_sroc_supplementary_billing
  END
  WHERE l.licence_id = $1;
`

const cleanUpAgreements = `
delete
  from water.licence_agreements la
  using water.financial_agreement_types fat
  where
    la.licence_ref=$1
    and la.source='nald'
    and concat_ws(':', fat.financial_agreement_code, la.start_date) <> any ($2)
    and la.financial_agreement_type_id=fat.financial_agreement_type_id
`

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

const createPurposeCondition = `
INSERT INTO water.licence_version_purpose_conditions (
  licence_version_purpose_id,
  licence_version_purpose_condition_type_id,
  param_1,
  param_2,
  notes,
  external_id
  ) VALUES (
  $1,
  (SELECT licence_version_purpose_condition_type_id
    FROM water.licence_version_purpose_condition_types
    WHERE code = $2 AND subcode = $3),
  $4,
  $5,
  $6,
   $7)
ON CONFLICT (external_id)
DO UPDATE SET
 licence_version_purpose_condition_type_id = excluded.licence_version_purpose_condition_type_id,
 param_1 = excluded.param_1,
 param_2 = excluded.param_2,
 notes = excluded.notes,
 date_updated = now();
`

module.exports = {
  createDocument,
  createDocumentRole,
  createCompany,
  createAddress,
  createContact,
  createInvoiceAccount,
  createInvoiceAccountAddress,
  createCompanyContact,
  createCompanyAddress,
  createAgreement,
  createLicence,
  createLicenceVersion,
  createLicenceVersionPurpose,
  getLicenceByRef,
  flagLicenceForSupplementaryBilling,
  cleanUpAgreements,
  createPurposeConditionTypes,
  createPurposeCondition
}
