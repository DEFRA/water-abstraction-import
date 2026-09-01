'use strict'

const db = require('../../../lib/connectors/db.js')
const { formatDateObjectToISO } = require('../../../lib/date-helpers.js')
const { generateUUID } = require('../../../lib/general.js')

async function go (missingVoidReturn, timestamp) {
  const returnId = _returnId(missingVoidReturn)
  const id = generateUUID()

  const params = [
    returnId,
    missingVoidReturn.licence_ref,
    missingVoidReturn.return_cycle_start_date,
    missingVoidReturn.return_cycle_end_date,
    missingVoidReturn.reporting_frequency,
    missingVoidReturn.metadata,
    timestamp,
    timestamp,
    missingVoidReturn.format_id,
    missingVoidReturn.return_cycle_due_date,
    missingVoidReturn.return_cycle_id,
    id,
    missingVoidReturn.return_requirement_id
  ]

  const query = `INSERT INTO "returns"."returns" (
  return_id,
  regime,
  licence_type,
  licence_ref,
  start_date,
  end_date,
  returns_frequency,
  status,
  "source",
  metadata,
  created_at,
  updated_at,
  return_requirement,
  due_date,
  return_cycle_id,
  id,
  return_requirement_id,
  quarterly
)
VALUES (
  $1,
  'water',
  'abstraction',
  $2,
  $3,
  $4,
  $5,
  'void',
  'NALD',
  $6,
  $7,
  $8,
  $9,
  $10,
  $11,
  $12,
  $13,
  FALSE
);
  `

  await db.query(query, params)

  return { id, returnId }
}

function _returnId (missingVoidReturn) {
  const regionCode = missingVoidReturn.region_code
  const licenceReference = missingVoidReturn.licence_ref
  const returnReference = missingVoidReturn.format_id
  const startDateAsString = formatDateObjectToISO(missingVoidReturn.return_cycle_start_date)
  const endDateAsString = formatDateObjectToISO(missingVoidReturn.return_cycle_end_date)

  return `v1:${regionCode}:${licenceReference}:${returnReference}:${startDateAsString}:${endDateAsString}`
}

module.exports = {
  go
}
