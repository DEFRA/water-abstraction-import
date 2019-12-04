exports.createDocument = `
INSERT INTO crm_v2.documents (regime, document_type, document_ref, version_number, status, start_date, end_date, external_id, date_created, date_updated)
VALUES ('water', 'abstraction_licence', $1, $2, $3, $4, $5, $6, NOW(), NOW())
ON CONFLICT (regime, document_type, version_number, document_ref)
  DO UPDATE SET start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date,
  status=EXCLUDED.status, external_id=EXCLUDED.external_id, date_updated=EXCLUDED.date_updated
`;

exports.createDocumentRole = `
INSERT INTO crm_v2.document_roles (document_id, role_id, company_id, contact_id, address_id, start_date, end_date, date_created, date_updated, invoice_account_id)

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
    end_date=EXCLUDED.end_date,
    date_updated=EXCLUDED.date_updated 
`;

exports.createCompany = `
INSERT INTO crm_v2.companies (name, type, external_id, date_created, date_updated)
VALUES ($1, $2, $3, NOW(), NOW())
ON CONFLICT (external_id) DO UPDATE SET name=EXCLUDED.name, date_updated=EXCLUDED.date_updated, type=EXCLUDED.type`;

exports.createAddress = `
INSERT INTO crm_v2.addresses (address_1, address_2, address_3, address_4,
town, county, postcode, country, external_id, date_created, date_updated)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
ON CONFLICT (external_id) DO UPDATE SET
address_1=EXCLUDED.address_1,
address_2=EXCLUDED.address_2,
address_3=EXCLUDED.address_3,
address_4=EXCLUDED.address_4,
town=EXCLUDED.town,
county=EXCLUDED.county,
postcode=EXCLUDED.postcode,
country=EXCLUDED.country,
date_updated=EXCLUDED.date_updated`;

exports.createContact = `
INSERT INTO crm_v2.contacts (salutation, initials, first_name, last_name, external_id, date_created, date_updated)
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
ON CONFLICT (external_id) DO UPDATE SET
  salutation=EXCLUDED.salutation,
  initials=EXCLUDED.initials,
  first_name=EXCLUDED.first_name,
  last_name=EXCLUDED.last_name,
  external_id=EXCLUDED.external_id,
  date_updated=EXCLUDED.date_updated`;

exports.createInvoiceAccount = `
INSERT INTO crm_v2.invoice_accounts (company_id, invoice_account_number, start_date, end_date, date_created, date_updated)
SELECT company_id, $1, $2, $3, NOW(), NOW() FROM crm_v2.companies WHERE external_id=$4 
ON CONFLICT (invoice_account_number) DO UPDATE SET
  company_id=EXCLUDED.company_id,
  start_date=EXCLUDED.start_date,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated`;

exports.createInvoiceAccountAddress = `
INSERT INTO crm_v2.invoice_account_addresses (invoice_account_id, address_id, start_date, end_date, date_updated, date_created)
SELECT ia.invoice_account_id, a.address_id, $3, $4, NOW(), NOW()
FROM crm_v2.invoice_accounts ia 
JOIN crm_v2.addresses a ON a.external_id=$2
WHERE ia.invoice_account_number=$1
ON CONFLICT (invoice_account_id, start_date) DO UPDATE SET 
  address_id=EXCLUDED.address_id,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated
`;

exports.createCompanyContact = `
INSERT INTO crm_v2.company_contacts (company_id, contact_id, role_id, start_date, end_date, is_default, date_created, date_updated)
SELECT c.company_id, o.contact_id, r.role_id, $4, $5, true, NOW(), NOW()
FROM crm_v2.companies c 
JOIN crm_v2.contacts o ON o.external_id=$2
JOIN crm_v2.roles r ON r.name=$3
WHERE c.external_id=$1
ON CONFLICT (company_id, contact_id, role_id, start_date) DO UPDATE SET 
  contact_id=EXCLUDED.contact_id,
  is_default=EXCLUDED.is_default,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated
`;

exports.createCompanyAddress = `
INSERT INTO crm_v2.company_addresses (company_id, address_id, role_id, start_date, end_date, is_default, date_created, date_updated)
SELECT c.company_id, a.address_id, r.role_id, $4, $5, true, NOW(), NOW()
FROM crm_v2.companies c 
JOIN crm_v2.addresses a ON a.external_id=$2
JOIN crm_v2.roles r ON r.name=$3
WHERE c.external_id=$1
ON CONFLICT (company_id, address_id, role_id) DO UPDATE SET 
  address_id=EXCLUDED.address_id,
  is_default=EXCLUDED.is_default,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated
`;

exports.createAgreement = `
INSERT INTO water.licence_agreements (licence_ref, financial_agreement_type_id, start_date, end_date, date_created, date_updated)
VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (licence_ref, financial_agreement_type_id, start_date) DO UPDATE SET 
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated
`
;
