'use strict';

const db = require('../db');
const sql = require('./sql/roles');

const getRoles = async (AABL_ID, FGAC_REGION_CODE) => {
  return db.dbQuery(sql.getRoles, [AABL_ID, FGAC_REGION_CODE]);
};

module.exports = {
  getRoles
};
