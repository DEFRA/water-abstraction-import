const clear = 'DELETE FROM water_import.import_companies;'

const initialise = `INSERT INTO water_import.import_companies 
(region_code, party_id, date_created, date_updated)
SELECT p."FGAC_REGION_CODE"::integer, p."ID"::integer, NOW(), NOW()
FROM import."NALD_PARTIES" p ON CONFLICT (region_code, party_id) DO NOTHING RETURNING *;`

const setImportedStatus = 'UPDATE water_import.import_companies  SET imported=true, date_updated=NOW() WHERE region_code=$1 AND party_id=$2;'

const getPendingCount = 'SELECT COUNT(*) FROM water_import.import_companies WHERE imported=false;'

module.exports = {
  clear,
  initialise,
  setImportedStatus,
  getPendingCount
}
