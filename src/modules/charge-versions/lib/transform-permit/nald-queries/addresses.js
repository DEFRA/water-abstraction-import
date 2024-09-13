'use strict'

const db = require('../db')
const sql = require('./sql/addresses')

const getAddress = async (addressId, regionCode) => {
  return db.dbQuery(sql.getAddress, [addressId, regionCode])
}

module.exports = {
  getAddress
}
