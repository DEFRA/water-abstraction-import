'use strict';

const db = require('../db');
const sql = require('./sql/core');

/**
 * Checks whether import table exists
 * @return {Promise} resolves with boolean
 */
const importTableExists = async () => {
  const rows = await db.dbQuery(sql.importTableExists);

  if (rows.length) {
    return rows[0].count >= 128;
  }
  return false;
};

exports.importTableExists = importTableExists;
