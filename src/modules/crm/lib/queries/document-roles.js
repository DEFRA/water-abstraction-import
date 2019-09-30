exports.insertBillingRole = `
INSERT INTO crm_v2.document_roles
  (document_id, company_id, invoice_account_id, role_id, start_date, end_date, date_created, date_updated)
VALUES
  ($1, $2, $3, $4, $5, $6, NOW(), NOW())
ON CONFLICT (document_id, company_id, invoice_account_id, role_id, start_date) DO UPDATE SET
  end_date=EXCLUDED.end_date,
  date_updated=EXCLUDED.date_updated
`;
