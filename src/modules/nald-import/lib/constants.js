const config = require('../../../../config');

exports.S3_IMPORT_PATH = config.import.nald.path;
exports.S3_IMPORT_FILE = 'nald_enc.zip';
exports.LOCAL_TEMP_PATH = './temp/';
exports.CSV_DIRECTORY = 'NALD';
exports.SCHEMA_IMPORT = 'import';
exports.SCHEMA_TEMP = 'import_temp';
exports.APPLICATION_STATE_KEY = 'nald-import';
