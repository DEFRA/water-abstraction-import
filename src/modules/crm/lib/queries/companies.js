const importInvoiceCompanies = `
INSERT INTO crm_v2.companies (external_id, date_updated, date_created, name, type)

SELECT
DISTINCT CONCAT_WS(':',  i."FGAC_REGION_CODE", i."ACON_APAR_ID") AS external_id,
 to_timestamp(p."LAST_CHANGED", 'DD/MM/YYYY HH24:MI:SS') AS date_updated,
 to_timestamp(p."LAST_CHANGED", 'DD/MM/YYYY HH24:MI:SS') AS date_created,
 CASE
  WHEN p."APAR_TYPE"='ORG' THEN p."NAME"
  WHEN p."FORENAME"='null' THEN CONCAT_WS(' ', NULLIF(p."SALUTATION", 'null'), NULLIF(p."INITIALS", 'null'), NULLIF(p."NAME", 'null'))
  ELSE CONCAT_WS(' ', NULLIF(p."SALUTATION", 'null'), NULLIF(p."FORENAME", 'null'), NULLIF(p."NAME", 'null'))
END AS name,
CASE
  WHEN p."APAR_TYPE"='ORG' THEN 'organisation'
  WHEN p."APAR_TYPE"='PER' THEN 'person'
END AS type
FROM import."NALD_IAS_INVOICE_ACCS" i
JOIN import."NALD_PARTIES" p ON i."FGAC_REGION_CODE"=p."FGAC_REGION_CODE" AND i."ACON_APAR_ID"=p."ID"

ON CONFLICT (external_id) DO UPDATE SET name=EXCLUDED.name, date_updated=EXCLUDED.date_updated, date_created=EXCLUDED.date_created, type=EXCLUDED.type
`;

exports.importInvoiceCompanies = importInvoiceCompanies;
