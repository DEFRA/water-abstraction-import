exports.createDocument = `
  INSERT INTO crm_v2.documents (regime, document_type, document_ref, version_number, status, start_date, end_date, external_id, date_created, date_updated, date_deleted)
  VALUES ('water', 'abstraction_licence', $1, $2, $3, $4, $5, $6, NOW(), NOW(), null)
  ON CONFLICT (regime, document_type, version_number, document_ref)
  DO UPDATE SET
    start_date=EXCLUDED.start_date,
    end_date=EXCLUDED.end_date,
    status=EXCLUDED.status,
    external_id=EXCLUDED.external_id,
    date_updated=EXCLUDED.date_updated,
    date_deleted=EXCLUDED.date_deleted;`;

exports.createDocumentRole = `INSERT INTO crm_v2.document_roles (document_id, role_id, company_id, contact_id, address_id, start_date, end_date, date_created, date_updated, invoice_account_id)
SELECT d.document_id, r.role_id, c.company_id, co.contact_id, a.address_id, $8, $9, NOW(), NOW(), ia.invoice_account_id
  FROM crm_v2.documents d
  JOIN crm_v2.roles r ON r.name=$3
  LEFT JOIN crm_v2.companies c ON c.external_id=$4
  LEFT JOIN crm_v2.contacts co ON co.external_id=$5
  LEFT JOIN crm_v2.addresses a ON a.external_id=$6
  LEFT JOIN crm_v2.invoice_accounts ia ON ia.invoice_account_number=$7
  WHERE d.document_ref=$1 AND version_number=$2
ON CONFLICT (document_id, role_id, start_date)
  DO UPDATE SET
    company_id=EXCLUDED.company_id,
    contact_id=EXCLUDED.contact_id,
    address_id=EXCLUDED.address_id,
    invoice_account_id=EXCLUDED.invoice_account_id,
    end_date=EXCLUDED.end_date,
    date_updated=EXCLUDED.date_updated;`;

exports.createCompany = `INSERT INTO crm_v2.companies (name, type, external_id, date_created, date_updated)
VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (external_id) DO UPDATE SET name=EXCLUDED.name,
date_updated=EXCLUDED.date_updated, type=EXCLUDED.type;`;

exports.createAddress = `INSERT INTO crm_v2.addresses (address_1, address_2, address_3, address_4,
town, county, postcode, country, external_id, data_source, date_created, date_updated)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'nald', NOW(), NOW()) ON CONFLICT (external_id) DO UPDATE SET
address_1=EXCLUDED.address_1,
address_2=EXCLUDED.address_2,
address_3=EXCLUDED.address_3,
address_4=EXCLUDED.address_4,
town=EXCLUDED.town,
county=EXCLUDED.county,
postcode=EXCLUDED.postcode,
country=EXCLUDED.country,
date_updated=EXCLUDED.date_updated;`;

exports.createContact = `INSERT INTO crm_v2.contacts (salutation, initials, first_name, last_name, external_id, data_source, date_created, date_updated)
VALUES ($1, $2, $3, $4, $5, 'nald', NOW(), NOW()) ON CONFLICT (external_id) DO UPDATE SET
  salutation=EXCLUDED.salutation,
  initials=EXCLUDED.initials,
  first_name=EXCLUDED.first_name,
  last_name=EXCLUDED.last_name,
  external_id=EXCLUDED.external_id,
  date_updated=EXCLUDED.date_updated;`;

exports.createInvoiceAccount = `INSERT INTO crm_v2.invoice_accounts (company_id, invoice_account_number, start_date, end_date, date_created, date_updated)
SELECT company_id, $1, $2, $3, NOW(), NOW() FROM crm_v2.companies WHERE external_id=$4
ON CONFLICT (invoice_account_number) DO UPDATE SET
  company_id=EXCLUDED.company_id,
  start_date=EXCLUDED.start_date,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated;`;

exports.createInvoiceAccountAddress = `INSERT INTO crm_v2.invoice_account_addresses (invoice_account_id, address_id, agent_company_id, start_date, end_date, date_updated, date_created)
SELECT ia.invoice_account_id, a.address_id, c.company_id, $3, $4, NOW(), NOW()
FROM crm_v2.invoice_accounts ia
JOIN crm_v2.addresses a ON a.external_id=$2
JOIN crm_v2.companies c ON c.external_id=$5
WHERE ia.invoice_account_number=$1 ON CONFLICT (invoice_account_id, start_date) DO UPDATE SET
  address_id=EXCLUDED.address_id,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated,
  agent_company_id=EXCLUDED.agent_company_id;`;

exports.createCompanyContact = `INSERT INTO crm_v2.company_contacts (company_id, contact_id, role_id, start_date, end_date, is_default, date_created, date_updated)
SELECT c.company_id, o.contact_id, r.role_id, $4, $5, true, NOW(), NOW()
FROM crm_v2.companies c
JOIN crm_v2.contacts o ON o.external_id=$2
JOIN crm_v2.roles r ON r.name=$3
WHERE c.external_id=$1 ON CONFLICT (company_id, contact_id, role_id, start_date) DO UPDATE SET
  contact_id=EXCLUDED.contact_id,
  is_default=EXCLUDED.is_default,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated;`;

exports.createCompanyAddress = `INSERT INTO crm_v2.company_addresses (company_id, address_id, role_id, start_date, end_date, is_default, date_created, date_updated)
SELECT c.company_id, a.address_id, r.role_id, $4, $5, true, NOW(), NOW()
FROM crm_v2.companies c
JOIN crm_v2.addresses a ON a.external_id=$2
JOIN crm_v2.roles r ON r.name=$3
WHERE c.external_id=$1
ON CONFLICT (company_id, address_id, role_id) DO UPDATE SET
  address_id=EXCLUDED.address_id,
  is_default=EXCLUDED.is_default,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated`;

exports.createAgreement = `insert into water.licence_agreements (licence_ref, financial_agreement_type_id, start_date, end_date, date_created, date_updated)
  select $1, t.financial_agreement_type_id, $3, $4, NOW(), NOW()
    from water.financial_agreement_types t
    where t.financial_agreement_code=$2 on conflict (licence_ref, financial_agreement_type_id, start_date)  do update set end_date=EXCLUDED.end_date, date_updated=EXCLUDED.date_updated;`;

exports.createLicence = `insert into water.licences (region_id, licence_ref, is_water_undertaker, regions, start_date, expired_date, lapsed_date, revoked_date)
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
  returning licence_id;`;

exports.createLicenceVersion = `insert into water.licence_versions (
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
    status = excluded.status,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    date_updated = now()
  returning licence_version_id;`;

exports.createLicenceVersionPurpose = `insert into water.licence_version_purposes (
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
    annual_quantity = excluded.annual_quantity,
    date_updated = now();`;
