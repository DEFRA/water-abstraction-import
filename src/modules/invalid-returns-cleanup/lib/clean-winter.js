'use strict'

const db = require('../../../lib/connectors/db.js')

async function go () {
  await _cleanLines()
  await _cleanVersions()
  await _cleanReturns()
}

async function _cleanLines () {
  const query = `
    WITH invalid_winter_return_logs AS (
      SELECT
        ir.return_id
      FROM
        "returns"."returns" ir
      WHERE
        ir.status = 'void'
        AND ir.start_date <> ir.end_date
        AND EXTRACT(DAY FROM ir.end_date) = 1
        AND EXTRACT(MONTH FROM ir.end_date) = 4
        AND ir.metadata->>'isSummer' = 'false'
    )
    DELETE FROM "returns".lines l WHERE l.version_id IN (
      SELECT
        v.version_id
      FROM
        "returns".versions v
      INNER JOIN invalid_winter_return_logs ON
        invalid_winter_return_logs.return_id = v.return_id
    );
  `

  await db.query(query)
}

async function _cleanReturns () {
  const query = `
    DELETE FROM "returns"."returns" r WHERE r.return_id IN (
      SELECT
        ir.return_id
      FROM
        "returns"."returns" ir
      WHERE
        ir.status = 'void'
        AND ir.start_date <> ir.end_date
        AND EXTRACT(DAY FROM ir.end_date) = 1
        AND EXTRACT(MONTH FROM ir.end_date) = 4
        AND ir.metadata->>'isSummer' = 'false'
    );
  `

  await db.query(query)
}

async function _cleanVersions () {
  const query = `
    WITH invalid_winter_return_logs AS (
      SELECT
        ir.return_id
      FROM
        "returns"."returns" ir
      WHERE
        ir.status = 'void'
        AND ir.start_date <> ir.end_date
        AND EXTRACT(DAY FROM ir.end_date) = 1
        AND EXTRACT(MONTH FROM ir.end_date) = 4
        AND ir.metadata->>'isSummer' = 'false'
    )
    DELETE FROM "returns".versions v WHERE v.return_id IN (
      SELECT
        invalid_winter_return_logs.return_id
      FROM
        invalid_winter_return_logs
    );
  `

  await db.query(query)
}

module.exports = {
  go
}
