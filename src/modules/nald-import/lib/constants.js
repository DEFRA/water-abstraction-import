const config = require('../../../../config')

module.exports = {
  S3_IMPORT_PATH: config.import.nald.path,
  S3_IMPORT_FILE: 'nald_enc.zip',
  LOCAL_TEMP_PATH: './temp/',
  CSV_DIRECTORY: 'NALD',
  SCHEMA_IMPORT: 'import',
  SCHEMA_TEMP: 'import_temp',
  APPLICATION_STATE_KEY: 'nald-import'
}
