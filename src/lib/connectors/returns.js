'use strict'

const { APIClient } = require('@envage/hapi-pg-rest-api')
const { serviceRequest } = require('@envage/water-abstraction-helpers')
const { pool } = require('./db')
const config = require('../../../config')

const rp = require('request-promise-native').defaults({
  proxy: null,
  strictSSL: false
})

const versions = new APIClient(rp, {
  endpoint: `${process.env.RETURNS_URI}/versions`,
  headers: {
    Authorization: process.env.JWT_TOKEN
  }
})

const lines = new APIClient(rp, {
  endpoint: `${process.env.RETURNS_URI}/lines`,
  headers: {
    Authorization: process.env.JWT_TOKEN
  }
})

const returns = new APIClient(rp, {
  endpoint: `${process.env.RETURNS_URI}/returns`,
  headers: {
    Authorization: process.env.JWT_TOKEN
  }
})

const deleteAllReturnsData = async returnId => {
  const deleteLinesQuery = 'delete from returns.lines where version_id in (select version_id from returns.versions where return_id=$1);'

  const deleteVersionsQuery = 'delete from returns.versions where return_id = $1;'

  const deleteReturnsQuery = 'delete from returns.returns where return_id = $1;'

  const deleteReturnRequirementPurposesQuery = `delete from water.return_requirement_purposes
    where return_requirement_id::varchar in (SELECT return_requirement_id::varchar FROM water.return_requirements
    where return_version_id = (SELECT return_version_id from returns.versions where return_id = $1))`

  const deleteReturnVersionsQuery = `delete from water.return_versions
    where return_version_id::varchar in (SELECT version_id::varchar from returns.versions where return_id = $1)`

  const deleteReturnRequirementsQuery = `delete from water.return_requirements
    where return_version_id::varchar in (SELECT version_id::varchar from returns.versions where return_id = $1)`

  await pool.query(deleteReturnVersionsQuery, [returnId])
  await pool.query(deleteReturnRequirementPurposesQuery, [returnId])
  await pool.query(deleteReturnRequirementsQuery, [returnId])

  await pool.query(deleteLinesQuery, [returnId])
  await pool.query(deleteVersionsQuery, [returnId])
  await pool.query(deleteReturnsQuery, [returnId])
}

module.exports = {
  versions,
  lines,
  returns,
  deleteAllReturnsData
}
