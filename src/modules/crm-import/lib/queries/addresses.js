const importInvoiceAddresses = `
INSERT INTO crm_v2.addresses
(external_id, address_1, address_2, address_3, address_4, town, county, country, postcode, date_created, date_updated)

SELECT
CONCAT_WS(':', a."FGAC_REGION_CODE", a."ID") AS external_id,
NULLIF(a."ADDR_LINE1", 'null') AS address_1,
NULLIF(a."ADDR_LINE2", 'null') AS address_2,
NULLIF(a."ADDR_LINE3", 'null') AS address_3,
NULLIF(a."ADDR_LINE4", 'null') AS address_4,
NULLIF(a."TOWN", 'null') AS town,
NULLIF(a."COUNTY", 'null') AS county,
NULLIF(a."COUNTRY", 'null') AS country,
NULLIF(a."POSTCODE", 'null') AS postcode,
NOW() AS date_created,
NOW() AS date_updated
FROM import."NALD_ADDRESSES" a


ON CONFLICT (external_id) DO UPDATE SET
address_1=EXCLUDED.address_1,
address_2=EXCLUDED.address_2,
address_3=EXCLUDED.address_3,
address_4=EXCLUDED.address_4,
town=EXCLUDED.town,
county=EXCLUDED.county,
country=EXCLUDED.country,
postcode=EXCLUDED.postcode,
date_updated=EXCLUDED.date_updated
`;

exports.importInvoiceAddresses = importInvoiceAddresses;
