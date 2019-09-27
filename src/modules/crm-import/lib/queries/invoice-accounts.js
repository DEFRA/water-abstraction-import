const importInvoiceAccounts = `
INSERT INTO crm_v2.invoice_accounts (company_id, ias_account_number, start_date, date_created, date_updated)

SELECT c.company_id, i."IAS_CUST_REF",
MIN(to_date(NULLIF(i."IAS_XFER_DATE", 'null'), 'DD/MM/YYYY')) AS start_date,
NOW() AS date_created, NOW() AS date_updated
FROM import."NALD_IAS_INVOICE_ACCS" i
JOIN (
SELECT i."IAS_CUST_REF",  COUNT(DISTINCT i."ACON_APAR_ID")
FROM import."NALD_IAS_INVOICE_ACCS" i
GROUP BY i."IAS_CUST_REF"
HAVING COUNT(DISTINCT i."ACON_APAR_ID")=1
) i2 ON i."IAS_CUST_REF"=i2."IAS_CUST_REF"
JOIN crm_v2.companies c ON c.external_id=CONCAT_WS(':', i."FGAC_REGION_CODE", i."ACON_APAR_ID")
GROUP BY c.company_id, i."IAS_CUST_REF"

ON CONFLICT (ias_account_number) DO UPDATE SET start_date=EXCLUDED.start_date, date_updated=EXCLUDED.date_updated`;

const getIASAccounts = `
SELECT i."FGAC_REGION_CODE", i."IAS_CUST_REF", i."ACON_AADD_ID",
to_date(i."IAS_XFER_DATE", 'DD/MM/YYYY') AS start_date,
ia.invoice_account_id, a.address_id
FROM import."NALD_IAS_INVOICE_ACCS" i
LEFT JOIN crm_v2.invoice_accounts ia ON i."IAS_CUST_REF"=ia.ias_account_number
LEFT JOIN crm_v2.addresses a ON a.external_id=CONCAT_WS(':', i."FGAC_REGION_CODE", i."ACON_AADD_ID")
WHERE i."IAS_XFER_DATE"<>'null' 
ORDER BY to_date(i."IAS_XFER_DATE", 'DD/MM/YYYY HH24:MI:SS')
`;

exports.importInvoiceAccounts = importInvoiceAccounts;
exports.getIASAccounts = getIASAccounts;
