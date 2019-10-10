/**
 * Imports companies discovered via IAS accounts and
 * licence holders
 */
const importCompanies = `
INSERT INTO crm_v2.companies (external_id, date_updated, date_created, name, type)

SELECT
DISTINCT CONCAT_WS(':',  p."FGAC_REGION_CODE", p."ID") AS external_id,
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
FROM import."NALD_PARTIES" p
JOIN
( 
  SELECT i."ACON_APAR_ID", i."FGAC_REGION_CODE" FROM import."NALD_IAS_INVOICE_ACCS" i 
  UNION SELECT v."ACON_APAR_ID", v."FGAC_REGION_CODE" FROM import."NALD_ABS_LIC_VERSIONS" v 
) p2 ON p."ID"=p2."ACON_APAR_ID" AND p."FGAC_REGION_CODE"=p2."FGAC_REGION_CODE"

ON CONFLICT (external_id) DO UPDATE SET name=EXCLUDED.name, date_updated=EXCLUDED.date_updated, date_created=EXCLUDED.date_created, type=EXCLUDED.type
`;

exports.importCompanies = importCompanies;
