const importInvoiceCompanyContacts = `
INSERT INTO crm_v2.company_contacts
(role_id, company_id, contact_id, start_date, is_default, date_created, date_updated)

SELECT DISTINCT
r.role_id,
c.company_id,
c2.contact_id,
to_timestamp(p."LAST_CHANGED", 'DD/MM/YYYY HH24:MI:SS') AS start_date,
true AS is_default,
NOW() AS date_created,
NOW() AS date_updated
 FROM import."NALD_IAS_INVOICE_ACCS" i
JOIN import."NALD_PARTIES" p ON i."FGAC_REGION_CODE"=p."FGAC_REGION_CODE" AND i."ACON_APAR_ID"=p."ID"
JOIN crm_v2.companies c ON c.external_id=CONCAT_WS(':',  i."FGAC_REGION_CODE", i."ACON_APAR_ID")
JOIN crm_v2.contacts c2 ON c2.external_id=CONCAT_WS(':',  i."FGAC_REGION_CODE", i."ACON_APAR_ID")
JOIN crm_v2.roles r ON r.name='billing'
WHERE p."APAR_TYPE"='PER'

ON CONFLICT (role_id, company_id, contact_id, start_date) DO UPDATE SET is_default=EXCLUDED.is_default, date_updated=EXCLUDED.date_updated`
;

exports.importInvoiceCompanyContacts = importInvoiceCompanyContacts;
