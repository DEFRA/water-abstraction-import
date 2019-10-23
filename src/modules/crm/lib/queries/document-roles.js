exports.insertBillingRole = `
INSERT INTO crm_v2.document_roles
  (document_id, company_id, invoice_account_id, role_id, start_date, end_date, date_created, date_updated)
VALUES
  ($1, $2, $3, $4, $5, $6, NOW(), NOW())
ON CONFLICT (document_id, role_id, start_date) DO UPDATE SET
  company_id=EXCLUDED.company_id,
  invoice_account_id=EXCLUDED.invoice_account_id,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated
`;

exports.insertLicenceHolderRole = `
INSERT INTO crm_v2.document_roles
  (document_id, company_id, contact_id, address_id, role_id, start_date, end_date, date_created, date_updated)
VALUES
  ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
ON CONFLICT (document_id, role_id, start_date) DO UPDATE SET
  company_id=EXCLUDED.company_id,
  contact_id=EXCLUDED.contact_id,
  address_id=EXCLUDED.address_id,
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated
`;
