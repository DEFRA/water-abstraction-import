const { pool } = require('../../../lib/connectors/db');
const queries = require('../queries');

const getLicence = async licenceNumber => {
  const { rows: [row] } = await pool.query(queries.getLicence, [licenceNumber]);
  return row;
};

const getLicenceVersions = async (regionCode, licenceId) => {
  const { rows } = await pool.query(queries.getLicenceVersions, [regionCode, licenceId]);
  return rows;
};

const getAllParties = async () => {
  const { rows } = await pool.query(queries.getAllParties);
  return rows;
};
const getAllAddresses = async () => {
  const { rows } = await pool.query(queries.getAllAddresses);
  return rows;
};

// const getParty = async (regionCode, partyId) => {
//   const { rows: [row] } = await pool.query(queries.getParty, [regionCode, partyId]);
//   return row;
// };

// const getAddress = async (regionCode, addressId) => {
//   const { rows: [row] } = await pool.query(queries.getAddress, [regionCode, addressId]);
//   return row;
// };

const getChargeVersions = async (regionCode, licenceId) => {
  const { rows } = await pool.query(queries.getChargeVersions, [regionCode, licenceId]);
  return rows;
};

exports.getLicence = getLicence;
exports.getLicenceVersions = getLicenceVersions;
exports.getChargeVersions = getChargeVersions;
exports.getAllAddresses = getAllAddresses;
exports.getAllParties = getAllParties;
