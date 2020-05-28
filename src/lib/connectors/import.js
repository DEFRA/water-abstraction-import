'use strict';

const { pool } = require('./db');

const getLicenceNumbersQuery = `
  select "LIC_NO"
  from import."NALD_ABS_LICENCES";
`;

const getLicenceNumbers = async () => {
  const response = await pool.query(getLicenceNumbersQuery);
  return response.rows || [];
};

exports.getLicenceNumbers = getLicenceNumbers;
