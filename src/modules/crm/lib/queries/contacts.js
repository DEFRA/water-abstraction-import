const importContacts = `
INSERT INTO crm_v2.contacts (external_id, date_updated, date_created, last_name, first_name, initials, salutation)

SELECT
DISTINCT CONCAT_WS(':',  p."FGAC_REGION_CODE", p."ID") AS external_id,
 to_timestamp(p."LAST_CHANGED", 'DD/MM/YYYY HH24:MI:SS') AS date_updated,
 to_timestamp(p."LAST_CHANGED", 'DD/MM/YYYY HH24:MI:SS') AS date_created,

 NULLIF(p."NAME", 'null') AS last_name,
 NULLIF(p."FORENAME", 'null') AS first_name,
 NULLIF(p."INITIALS", 'null') AS initials,
 NULLIF(p."SALUTATION", 'null') AS salutation

FROM import."NALD_PARTIES" p 

WHERE p."APAR_TYPE"='PER'

ON CONFLICT (external_id) DO UPDATE SET date_updated=EXCLUDED.date_updated, date_created=EXCLUDED.date_created,
last_name=EXCLUDED.last_name, first_name=EXCLUDED.first_name, initials=EXCLUDED.initials, salutation=EXCLUDED.salutation`;

exports.importContacts = importContacts;
